import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Keyboard,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Trophy,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { useStore, useVocabDeck, useVocabItemsByDeck, useAllVocabItems } from '../../store';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import { speakText, stopSpeech } from '../../utils/speech';
import {
  BOX_CONFIG,
  isVocabDue,
  checkTranslationAnswer,
  type AnswerCheckResult,
} from './vocabLeitner';
import type { VocabItem } from '../../types';

type LearnMode = 'flip' | 'type';

export const VocabLearnSession: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const deck = useVocabDeck(deckId);
  const deckItems = useVocabItemsByDeck(deckId);
  const allItems = useAllVocabItems();
  const { recordVocabResult } = useStore();

  // URL query params
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const filterParam = queryParams.get('filter'); // 'due' | 'all' | null
  const boxParam = queryParams.get('box'); // '1'..'5' | null

  // Session Settings
  const [mode, setMode] = useState<LearnMode>('type'); // 'flip' or 'type'
  const [autoAudio, setAutoAudio] = useState(true); // default true per user request

  // Prepare card queue
  const queueCards = useMemo(() => {
    let source = deckId ? deckItems : allItems;

    if (boxParam) {
      const boxNum = parseInt(boxParam, 10);
      if (!isNaN(boxNum)) {
        source = source.filter((i) => i.box === boxNum);
      }
    } else if (filterParam === 'all') {
      // Free practice: all cards
    } else {
      // Default: Due cards first. If no due cards exist, fall back to all cards so user is never locked out!
      const dueCards = source.filter((i) => isVocabDue(i));
      if (dueCards.length > 0) {
        source = dueCards;
      }
    }

    // Shuffle queue for varied learning
    return [...source].sort(() => Math.random() - 0.5);
  }, [deckId, deckItems, allItems, filterParam, boxParam]);

  // Session state
  const [sessionCards, setSessionCards] = useState<VocabItem[]>(queueCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  // Type mode state
  const [userInput, setUserInput] = useState('');
  const [answerResult, setAnswerResult] = useState<AnswerCheckResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Session statistics
  const [stats, setStats] = useState({
    correct: 0,
    incorrect: 0,
    promotedToBox: [] as { foreign: string; fromBox: number; toBox: number }[],
    demotedToBox1: [] as { foreign: string; fromBox: number }[],
  });

  const [isFinished, setIsFinished] = useState(false);

  // Sync cards when queue changes initially
  useEffect(() => {
    setSessionCards(queueCards);
    setCurrentIndex(0);
    setIsFinished(false);
  }, [queueCards]);

  const currentCard = sessionCards[currentIndex];
  const progressPct = sessionCards.length > 0 ? (currentIndex / sessionCards.length) * 100 : 0;

  // Find deck language code for speech
  const effectiveDeck = deckId
    ? deck
    : currentCard
    ? useStore.getState().vocabDecks?.[currentCard.deckId]
    : undefined;
  const langCode = effectiveDeck?.langCode || 'en-US';
  const langName = effectiveDeck?.language || 'Fremdsprache';

  // Play audio pronunciation
  const playAudio = useCallback(
    (text?: string) => {
      const wordToSpeak = text || currentCard?.foreignWord;
      if (!wordToSpeak) return;
      speakText(wordToSpeak, langCode);
    },
    [currentCard, langCode]
  );

  // Whenever active card changes: reset state and trigger auto-audio
  useEffect(() => {
    setIsRevealed(false);
    setUserInput('');
    setAnswerResult(null);

    if (currentCard && autoAudio) {
      // Small timeout for smooth audio transition
      const timer = setTimeout(() => {
        playAudio(currentCard.foreignWord);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentCard?.id, autoAudio, playAudio]);

  // Focus input on type mode
  useEffect(() => {
    if (mode === 'type' && !answerResult) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [currentIndex, mode, answerResult]);

  // Handle Answer Evaluation
  const advanceToNext = useCallback(
    (isCorrect: boolean) => {
      if (!currentCard) return;

      const fromBox = currentCard.box;
      const toBox = isCorrect ? Math.min(5, fromBox + 1) : 1;

      // Update store
      recordVocabResult(currentCard.id, isCorrect);

      // Update stats
      setStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
        promotedToBox: isCorrect
          ? [...prev.promotedToBox, { foreign: currentCard.foreignWord, fromBox, toBox }]
          : prev.promotedToBox,
        demotedToBox1: !isCorrect
          ? [...prev.demotedToBox1, { foreign: currentCard.foreignWord, fromBox }]
          : prev.demotedToBox1,
      }));

      if (currentIndex + 1 >= sessionCards.length) {
        setIsFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentCard, currentIndex, sessionCards.length, recordVocabResult]
  );

  // Type Mode Check
  const handleCheckAnswer = () => {
    if (!currentCard || !userInput.trim()) return;

    const result = checkTranslationAnswer(userInput, currentCard.germanWord);
    setAnswerResult(result);
    setIsRevealed(true);

    if (result.status === 'exact') {
      // Auto advance or wait on click/enter
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished) return;

      if (mode === 'type') {
        if (!answerResult) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCheckAnswer();
          }
        } else {
          // Answer has been checked
          if (e.key === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            if (answerResult.status === 'exact') {
              advanceToNext(true);
            } else if (answerResult.status === 'close') {
              // Default to correct on Enter
              advanceToNext(true);
            } else {
              advanceToNext(false);
            }
          } else if (e.key === '1') {
            advanceToNext(false);
          } else if (e.key === '2') {
            advanceToNext(true);
          }
        }
      } else {
        // Mode === 'flip'
        if (!isRevealed) {
          if (e.code === 'Space' || e.key === 'Enter') {
            e.preventDefault();
            setIsRevealed(true);
          }
        } else {
          if (e.key === '1') {
            advanceToNext(false);
          } else if (e.key === '2' || e.code === 'Space' || e.key === 'Enter') {
            advanceToNext(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isRevealed, answerResult, isFinished, handleCheckAnswer, advanceToNext]);

  // Restart session
  const handleRestartSession = (onlyWrong = false) => {
    stopSpeech();
    let nextQueue: VocabItem[] = [];

    if (onlyWrong && stats.demotedToBox1.length > 0) {
      const wrongWords = new Set(stats.demotedToBox1.map((w) => w.foreign));
      nextQueue = sessionCards.filter((c) => wrongWords.has(c.foreignWord));
    } else {
      nextQueue = [...sessionCards].sort(() => Math.random() - 0.5);
    }

    setSessionCards(nextQueue);
    setCurrentIndex(0);
    setIsRevealed(false);
    setUserInput('');
    setAnswerResult(null);
    setStats({
      correct: 0,
      incorrect: 0,
      promotedToBox: [],
      demotedToBox1: [],
    });
    setIsFinished(false);
  };

  if (sessionCards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
          <Sparkles size={28} />
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Keine fälligen Vokabeln!</h2>
        <p className="text-xs text-text-secondary mb-6 leading-relaxed">
          Aktuell stehen keine Vokabeln zur Wiederholung an. Du hast alles gemeistert!
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          <Button
            variant="primary"
            onClick={() => {
              navigate(
                deckId ? `/vocab/${deckId}/learn?filter=all` : '/vocab/learn?filter=all',
                { replace: true }
              );
            }}
            className="w-full gap-2 bg-indigo-600 text-white"
          >
            <RotateCcw size={14} />
            <span>Trotzdem frei üben (Alle)</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(deckId ? `/vocab/${deckId}` : '/vocab')}
            className="w-full"
          >
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  // End of Session Summary
  if (isFinished) {
    const totalAnswered = stats.correct + stats.incorrect;
    const accuracy = totalAnswered > 0 ? Math.round((stats.correct / totalAnswered) * 100) : 0;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-xl mx-auto w-full">
        <div className="bg-bg-canvas rounded-2xl border border-border p-6 sm:p-8 shadow-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-xs">
            <Trophy size={32} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-text-primary tracking-tight">
              Lerneinheit abgeschlossen!
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Großartig! Dein Leitner-Kästchen-Fortschritt wurde erfolgreich aktualisiert.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-bg-secondary rounded-xl border border-border">
            <div>
              <span className="block text-[11px] font-semibold text-text-secondary uppercase">
                Gelernt
              </span>
              <span className="text-xl font-bold text-text-primary">{totalAnswered}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-emerald-600 uppercase">
                Richtig
              </span>
              <span className="text-xl font-bold text-emerald-600">{stats.correct}</span>
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-text-secondary uppercase">
                Genauigkeit
              </span>
              <span className="text-xl font-bold text-text-primary">{accuracy}%</span>
            </div>
          </div>

          {/* Promoted / Demoted overview */}
          <div className="text-left text-xs space-y-2 max-h-48 overflow-y-auto scrollbar-thin p-3 rounded-lg bg-bg-secondary border border-border">
            {stats.promotedToBox.length > 0 && (
              <div className="text-emerald-700 dark:text-emerald-400">
                <span className="font-semibold">
                  ↑ {stats.promotedToBox.length} Vokabeln aufgestiegen:
                </span>{' '}
                {stats.promotedToBox.map((p) => p.foreign).join(', ')}
              </div>
            )}
            {stats.demotedToBox1.length > 0 && (
              <div className="text-red-600 dark:text-red-400">
                <span className="font-semibold">
                  ↓ {stats.demotedToBox1.length} Vokabeln zurück auf Box 1 (zur Wiederholung):
                </span>{' '}
                {stats.demotedToBox1.map((p) => p.foreign).join(', ')}
              </div>
            )}
            {stats.demotedToBox1.length === 0 && (
              <div className="text-emerald-600 font-medium">Perfekt! Keine Fehler gemacht.</div>
            )}
          </div>

          {/* Next action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            {stats.demotedToBox1.length > 0 && (
              <Button
                variant="primary"
                onClick={() => handleRestartSession(true)}
                className="w-full gap-2 bg-indigo-600 text-white"
              >
                <RotateCcw size={14} />
                <span>Fehler wiederholen ({stats.demotedToBox1.length})</span>
              </Button>
            )}

            <Button
              variant={stats.demotedToBox1.length > 0 ? 'secondary' : 'primary'}
              onClick={() => handleRestartSession(false)}
              className={cn(
                'w-full gap-2',
                stats.demotedToBox1.length === 0 && 'bg-indigo-600 text-white'
              )}
            >
              <RotateCcw size={14} />
              <span>Einheit nochmal wiederholen</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate(deckId ? `/vocab/${deckId}` : '/vocab')}
              className="w-full"
            >
              Fertig
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const boxConfig = BOX_CONFIG[currentCard.box] || BOX_CONFIG[1];

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto scrollbar-thin">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-bg-canvas/90 backdrop-blur-xs sticky top-0 z-20 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                stopSpeech();
                navigate(deckId ? `/vocab/${deckId}` : '/vocab');
              }}
              className="p-1.5 rounded-lg border border-border bg-bg-canvas hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title="Lernsitzung beenden"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <span className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider block">
                {deck ? deck.title : 'Alle Themenpakete'}
              </span>
              <span className="text-xs font-bold text-text-primary">
                Karte {currentIndex + 1} von {sessionCards.length}
              </span>
            </div>
          </div>

          {/* Mode Switcher & Audio Toggle */}
          <div className="flex items-center gap-2">
            {/* Auto Audio Toggle */}
            <button
              onClick={() => setAutoAudio((a) => !a)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer',
                autoAudio
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-300'
                  : 'border-border bg-bg-canvas text-text-disabled hover:text-text-secondary'
              )}
              title={autoAudio ? 'Automatische Aussprache ist AN' : 'Automatische Aussprache ist AUS'}
            >
              {autoAudio ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span className="hidden sm:inline">Auto-Audio</span>
            </button>

            {/* Mode Toggle Button */}
            <div className="flex rounded-lg border border-border p-0.5 bg-bg-secondary">
              <button
                onClick={() => setMode('type')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  mode === 'type'
                    ? 'bg-bg-canvas text-text-primary shadow-xs font-semibold'
                    : 'text-text-disabled hover:text-text-secondary'
                )}
                title="Tipp-Modus: Übersetzung aktiv eintippen"
              >
                <Keyboard size={12} />
                <span className="hidden sm:inline">Tippen</span>
              </button>
              <button
                onClick={() => setMode('flip')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  mode === 'flip'
                    ? 'bg-bg-canvas text-text-primary shadow-xs font-semibold'
                    : 'text-text-disabled hover:text-text-secondary'
                )}
                title="Aufdeck-Modus: Selbsteinschätzung"
              >
                <Eye size={12} />
                <span className="hidden sm:inline">Aufdecken</span>
              </button>
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="max-w-3xl mx-auto w-full mt-2.5">
          <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Study Arena */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-2xl mx-auto w-full">
        <div className="w-full bg-bg-canvas rounded-2xl border border-border shadow-md overflow-hidden flex flex-col transition-all">
          {/* Card Header: Leitner Box & Language info */}
          <div className="p-4 border-b border-border bg-bg-secondary/40 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                boxConfig.badgeClass
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: boxConfig.color }} />
              <span>{boxConfig.label}</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary font-medium">{langName}</span>
              <button
                onClick={() => playAudio()}
                className="p-1.5 rounded-lg border border-border bg-bg-canvas hover:bg-bg-hover text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                title="Aussprache wiederholen"
              >
                <Volume2 size={15} />
              </button>
            </div>
          </div>

          {/* Card Body: Question (Always Foreign Word) */}
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div>
              <span className="text-[11px] font-semibold text-text-disabled uppercase tracking-widest block mb-2">
                Fremdwort
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
                {currentCard.foreignWord}
              </h2>

              {currentCard.phonetic && (
                <p className="text-xs text-text-disabled font-mono mt-1">[{currentCard.phonetic}]</p>
              )}
            </div>

            {currentCard.exampleSentence && (
              <div className="p-3 rounded-xl bg-bg-secondary border border-border text-xs text-text-secondary max-w-md mx-auto">
                <span className="italic font-serif text-text-primary block">
                  „{currentCard.exampleSentence}“
                </span>
                {isRevealed && currentCard.exampleTranslation && (
                  <span className="text-text-disabled block mt-1">
                    ({currentCard.exampleTranslation})
                  </span>
                )}
              </div>
            )}

            {/* In Flip Mode: Reveal Answer */}
            {mode === 'flip' && (
              <div className="pt-4">
                {!isRevealed ? (
                  <button
                    onClick={() => setIsRevealed(true)}
                    className="w-full py-4 px-6 rounded-xl border-2 border-dashed border-border hover:border-indigo-400 hover:bg-indigo-50/20 text-text-secondary hover:text-text-primary transition-all text-xs font-medium cursor-pointer"
                  >
                    Klicken oder <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono text-[10px]">Leertaste</kbd> drücken zum Aufdecken
                  </button>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-900">
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">
                        Deutsche Übersetzung
                      </span>
                      <p className="text-2xl font-bold text-text-primary">{currentCard.germanWord}</p>
                      {currentCard.notes && (
                        <p className="text-xs text-text-secondary mt-1.5">{currentCard.notes}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => advanceToNext(false)}
                        className="py-3 px-4 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer dark:bg-red-950/40 dark:border-red-900 dark:text-red-300"
                      >
                        <X size={15} />
                        <span>Falsch [1]</span>
                      </button>

                      <button
                        onClick={() => advanceToNext(true)}
                        className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300"
                      >
                        <Check size={15} />
                        <span>Richtig gewusst [2]</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* In Type Mode: Text Input & Evaluation */}
            {mode === 'type' && (
              <div className="pt-2 space-y-4 text-left">
                {!answerResult ? (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5 text-center">
                      Deutsche Übersetzung eintippen:
                    </label>
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Übersetzung eingeben..."
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-border bg-bg-canvas text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-indigo-500 shadow-xs"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                      />
                      <Button
                        variant="primary"
                        onClick={handleCheckAnswer}
                        disabled={!userInput.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 rounded-xl"
                      >
                        Prüfen ↵
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Status Feedback Banner */}
                    {answerResult.status === 'exact' && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-200 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <Check size={16} className="text-emerald-600" />
                          <span>Perfekt richtig!</span>
                        </div>
                        <div className="text-xs">
                          Lösung: <strong>{currentCard.germanWord}</strong>
                        </div>
                      </div>
                    )}

                    {answerResult.status === 'close' && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <Sparkles size={16} className="text-amber-600" />
                          <span>Fast richtig (kleiner Tippfehler)!</span>
                        </div>
                        <div className="text-xs">
                          Deine Eingabe: <span className="line-through">{userInput}</span>
                        </div>
                        <div className="text-xs">
                          Richtige Schreibweise: <strong>{currentCard.germanWord}</strong>
                        </div>
                      </div>
                    )}

                    {answerResult.status === 'incorrect' && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <X size={16} className="text-red-600" />
                          <span>Leider nicht richtig</span>
                        </div>
                        <div className="text-xs">
                          Deine Eingabe: <span className="line-through">{userInput || '(leer)'}</span>
                        </div>
                        <div className="text-xs font-semibold">
                          Richtige Lösung: <strong className="text-text-primary">{currentCard.germanWord}</strong>
                        </div>
                        {currentCard.notes && (
                          <div className="text-[11px] text-text-secondary mt-1">{currentCard.notes}</div>
                        )}
                      </div>
                    )}

                    {/* Action buttons following type check */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      {answerResult.status === 'close' ? (
                        <>
                          <Button
                            variant="secondary"
                            onClick={() => advanceToNext(false)}
                            className="flex-1 text-red-600 hover:bg-red-50"
                          >
                            Als falsch werten [1]
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => advanceToNext(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                          >
                            Trotzdem als richtig werten [2]
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => advanceToNext(answerResult.status === 'exact')}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl gap-2"
                        >
                          <span>Weiter (Enter)</span>
                          <ArrowRight size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer shortcuts hint */}
        <div className="mt-4 text-center text-[11px] text-text-disabled flex items-center justify-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">↵ Enter</kbd>{' '}
            Prüfen / Weiter
          </span>
          {mode === 'flip' && (
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">Leertaste</kbd>{' '}
              Aufdecken
            </span>
          )}
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">1</kbd> Falsch
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">2</kbd> Richtig
          </span>
        </div>
      </div>
    </div>
  );
};
