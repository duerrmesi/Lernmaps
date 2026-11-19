import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Volume2,
  Repeat,
  Eye,
  Keyboard,
} from 'lucide-react';
import { useStore, useFlashcardsByProject } from '../../store';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import { now } from '../../utils';
import type { FlashcardDifficulty } from '../../types';
import { speakText } from '../../utils/speech';

type LearnDifficulty = FlashcardDifficulty;

export const LearnMode: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, updateFlashcard } = useStore();
  const allCards = useFlashcardsByProject(projectId || '');
  const project = projectId ? projects[projectId] : null;

  // Extract tag from URL query
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeTag = queryParams.get('tag');

  // Filter cards by tag if specified
  const eligibleCards = useMemo(() => {
    let list = allCards;
    if (activeTag) {
      list = list.filter((c) => c.tags?.includes(activeTag));
    }
    return [...list].sort(() => Math.random() - 0.5);
  }, [allCards, activeTag]);

  const [cards, setCards] = useState(eligibleCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [finished, setFinished] = useState(false);

  // Occlusion specific: set of unmasked box IDs
  const [unmaskedBoxIds, setUnmaskedBoxIds] = useState<Set<string>>(new Set());

  // Reverse card randomizer: true if this card review is flipped
  const [isFlippedOrder, setIsFlippedOrder] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? currentIndex / cards.length : 0;
  const isOcclusion = currentCard?.cardType === 'occlusion';

  // Determine flip status when index changes
  useEffect(() => {
    setRevealed(false);
    setUnmaskedBoxIds(new Set());
    if (currentCard?.isReverse) {
      setIsFlippedOrder(Math.random() < 0.5);
    } else {
      setIsFlippedOrder(false);
    }
  }, [currentIndex, currentCard]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    if (isOcclusion && currentCard.occlusionBoxes) {
      // Unmask all boxes
      setUnmaskedBoxIds(new Set(currentCard.occlusionBoxes.map((b) => b.id)));
    }
  }, [isOcclusion, currentCard]);

  const toggleUnmaskBox = (boxId: string) => {
    setUnmaskedBoxIds((prev) => {
      const next = new Set(prev);
      if (next.has(boxId)) next.delete(boxId);
      else next.add(boxId);
      return next;
    });
  };

  const handleAnswer = useCallback(
    (difficulty: LearnDifficulty) => {
      if (!currentCard) return;

      updateFlashcard(currentCard.id, {
        difficulty,
        lastReviewed: now(),
        reviewCount: currentCard.reviewCount + 1,
      });

      setSessionStats((s) => ({ ...s, [difficulty]: s[difficulty] + 1 }));

      if (currentIndex + 1 >= cards.length) {
        setFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentCard, currentIndex, cards.length, updateFlashcard]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (!revealed) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleReveal();
        }
      } else {
        if (e.key === '1') handleAnswer('again');
        else if (e.key === '2') handleAnswer('hard');
        else if (e.key === '3') handleAnswer('good');
        else if (e.key === '4') handleAnswer('easy');
        else if (e.code === 'Space' || e.code === 'Enter') {
          // Default to 'good' on Space when already revealed
          handleAnswer('good');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, handleReveal, handleAnswer]);

  const handleSpeak = (text: string) => {
    speakText(text);
  };

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-text-secondary">
          {activeTag
            ? `Keine Karteikarten mit dem Tag #${activeTag} vorhanden.`
            : 'Keine Karteikarten im Projekt vorhanden.'}
        </p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Zurück
        </Button>
      </div>
    );
  }

  if (finished) {
    const total = cards.length;
    const knownCount = sessionStats.good + sessionStats.easy;
    const percent = Math.round((knownCount / total) * 100);

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white border border-border rounded-xl p-8 shadow-sm">
          <CheckCircle size={44} className="text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
          <h2 className="text-2xl font-semibold text-text-primary mb-1">
            Lerneinheit abgeschlossen!
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Du hast {total} {total === 1 ? 'Karte' : 'Karten'} durchgearbeitet • {percent}% Erfolgsquote
          </p>

          <div className="grid grid-cols-4 gap-2 mb-8">
            <StatBox label="Nochmal" value={sessionStats.again} color="danger" />
            <StatBox label="Schwer" value={sessionStats.hard} color="warning" />
            <StatBox label="Gut" value={sessionStats.good} color="accent" />
            <StatBox label="Einfach" value={sessionStats.easy} color="success" />
          </div>

          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              onClick={() => navigate(`/projects/${projectId}/flashcards`)}
            >
              Zur Übersicht
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCards([...cards].sort(() => Math.random() - 0.5));
                setCurrentIndex(0);
                setRevealed(false);
                setFinished(false);
                setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
              }}
            >
              <RotateCcw size={13} /> Nochmal lernen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const displayedQuestion = isFlippedOrder ? currentCard?.back : currentCard?.front;
  const displayedAnswer = isFlippedOrder ? currentCard?.front : currentCard?.back;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg-canvas">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border bg-white">
        <button
          onClick={() => navigate(`/projects/${projectId}/flashcards`)}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> {project?.title || 'Karteikarten'}
        </button>

        <div className="flex items-center gap-3">
          {activeTag && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-light text-accent font-medium">
              #{activeTag}
            </span>
          )}
          <span className="text-xs font-mono text-text-disabled">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-bg-tertiary shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          {/* Flipped Card Badge */}
          {isFlippedOrder && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-md mb-3 w-fit">
              <Repeat size={12} />
              <span>Umkehrkarte: Rückseite als Frage</span>
            </div>
          )}

          {/* OCCLUSION CARD MODE */}
          {isOcclusion && currentCard?.imageUrl ? (
            <div className="bg-white border border-border rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  🖼️ Bild-Okklusion
                </span>
                <span className="text-xs text-text-disabled">
                  Klicke auf eine Maske oder nutze „Antwort aufdecken“
                </span>
              </div>

              <p className="text-base font-medium text-text-primary">{currentCard.front}</p>

              {/* Image with interactive occlusion boxes */}
              <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[420px]">
                <img
                  src={currentCard.imageUrl}
                  alt="Occlusion question"
                  className="max-h-[420px] w-full object-contain pointer-events-none select-none"
                />

                {currentCard.occlusionBoxes?.map((box, idx) => {
                  const isUnmasked = unmaskedBoxIds.has(box.id) || revealed;
                  return (
                    <div
                      key={box.id}
                      onClick={() => toggleUnmaskBox(box.id)}
                      className={`absolute border-2 rounded transition-all cursor-pointer flex items-center justify-center select-none shadow-xs ${
                        isUnmasked
                          ? 'border-emerald-500 bg-white/95 text-emerald-950 font-semibold p-1'
                          : 'border-amber-600 bg-amber-500 hover:bg-amber-400 text-white animate-pulse'
                      }`}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      title={isUnmasked ? box.label : 'Klicken zum Aufdecken'}
                    >
                      {isUnmasked ? (
                        <span className="text-[11px] text-center font-bold truncate px-1">
                          {box.label || `Lösung #${idx + 1}`}
                        </span>
                      ) : (
                        <span className="text-xs font-black drop-shadow">? ({idx + 1})</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Revealed solutions list */}
              {revealed && currentCard.occlusionBoxes && (
                <div className="bg-bg-secondary p-3 rounded-lg border border-border space-y-1 text-xs">
                  <p className="font-semibold text-text-primary mb-1">Alle Lösungen:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {currentCard.occlusionBoxes.map((b, idx) => (
                      <div key={b.id} className="flex items-center gap-1.5 text-text-secondary">
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-text-primary">{b.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STANDARD FLASHCARD MODE */
            <div className="bg-white border border-border rounded-xl p-8 min-h-[220px] flex flex-col shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-text-disabled uppercase tracking-wider">
                  Frage
                </span>
                <button
                  onClick={() => handleSpeak(displayedQuestion || '')}
                  className="p-1 text-text-disabled hover:text-text-primary rounded transition-colors"
                  title="Frage vorlesen"
                >
                  <Volume2 size={15} />
                </button>
              </div>

              <p className="text-lg text-text-primary font-medium leading-relaxed flex-1">
                {displayedQuestion}
              </p>

              {currentCard?.tags && currentCard.tags.length > 0 && (
                <div className="flex gap-1.5 mt-4 pt-4 border-t border-border flex-wrap">
                  {currentCard.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-bg-secondary text-text-secondary"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reveal & Rating Section */}
          {!revealed ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleReveal}
                className="px-10 py-3 text-sm font-medium shadow-sm"
              >
                <Eye size={15} /> Antwort aufdecken
              </Button>
              <span className="text-[11px] text-text-disabled flex items-center gap-1">
                <Keyboard size={11} /> Leertaste oder Enter drücken
              </span>
            </div>
          ) : (
            <div className="mt-4 space-y-5 animate-in fade-in duration-200">
              {/* Answer Box (for non-occlusion) */}
              {!isOcclusion && (
                <div className="border border-border-strong rounded-xl p-6 bg-bg-secondary">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-disabled uppercase tracking-wider">
                      Antwort
                    </span>
                    <button
                      onClick={() => handleSpeak(displayedAnswer || '')}
                      className="p-1 text-text-disabled hover:text-text-primary rounded transition-colors"
                      title="Antwort vorlesen"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {displayedAnswer}
                  </p>
                </div>
              )}

              {/* Rating buttons */}
              <div>
                <p className="text-center text-[11px] text-text-disabled uppercase tracking-wider mb-2.5 font-semibold">
                  Wie gut hast du es gewusst? (Tasten 1 – 4)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <DifficultyButton
                    label="Nochmal"
                    shortcut="[1]"
                    sublabel="< 1 Min"
                    color="danger"
                    onClick={() => handleAnswer('again')}
                  />
                  <DifficultyButton
                    label="Schwierig"
                    shortcut="[2]"
                    sublabel="~ 10 Min"
                    color="warning"
                    onClick={() => handleAnswer('hard')}
                  />
                  <DifficultyButton
                    label="Gut"
                    shortcut="[3]"
                    sublabel="1–2 Tage"
                    color="accent"
                    onClick={() => handleAnswer('good')}
                  />
                  <DifficultyButton
                    label="Einfach"
                    shortcut="[4]"
                    sublabel="4+ Tage"
                    color="success"
                    onClick={() => handleAnswer('easy')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DifficultyButtonProps {
  label: string;
  sublabel: string;
  shortcut: string;
  color: 'danger' | 'warning' | 'accent' | 'success';
  onClick: () => void;
}

const colorMap = {
  danger: 'border-danger/30 hover:bg-danger-light hover:border-danger text-danger bg-white',
  warning: 'border-warning/30 hover:bg-warning-light hover:border-warning text-warning bg-white',
  accent: 'border-accent/30 hover:bg-accent-light hover:border-accent text-accent bg-white',
  success: 'border-success/30 hover:bg-success-light hover:border-success text-success bg-white',
};

const DifficultyButton: React.FC<DifficultyButtonProps> = ({
  label,
  sublabel,
  shortcut,
  color,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-0.5 py-2.5 px-2 rounded-lg border transition-all shadow-2xs hover:shadow-sm cursor-pointer',
      colorMap[color]
    )}
  >
    <div className="flex items-center gap-1">
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-[10px] opacity-60 font-mono">{shortcut}</span>
    </div>
    <span className="text-[10px] opacity-70">{sublabel}</span>
  </button>
);

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, color }) => (
  <div
    className={cn('rounded-lg p-3 text-center border', {
      'bg-danger-light/60 border-danger/30 text-danger': color === 'danger',
      'bg-warning-light/60 border-warning/30 text-warning': color === 'warning',
      'bg-accent-light/60 border-accent/30 text-accent': color === 'accent',
      'bg-success-light/60 border-success/30 text-success': color === 'success',
    })}
  >
    <p className="text-2xl font-semibold">{value}</p>
    <p className="text-[11px] mt-0.5 font-medium">{label}</p>
  </div>
);
