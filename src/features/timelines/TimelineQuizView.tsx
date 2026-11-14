import React, { useState, useEffect, useCallback } from 'react';
import type { TimelineEvent } from '../../types';
import { sortTimelineEvents } from './timelineUtils';
import { Button } from '../../components/Button';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Trophy,
} from 'lucide-react';

interface TimelineQuizViewProps {
  events: TimelineEvent[];
}

export const TimelineQuizView: React.FC<TimelineQuizViewProps> = ({ events }) => {
  const [mode, setMode] = useState<'order' | 'guess'>('order');

  // Mode: Order Quiz State
  const [orderItems, setOrderItems] = useState<TimelineEvent[]>(() =>
    [...events].sort(() => 0.5 - Math.random()).slice(0, 5)
  );
  const [checkedOrder, setCheckedOrder] = useState(false);
  const [orderScore, setOrderScore] = useState<{ correct: number; total: number } | null>(null);

  // Mode: Guess Quiz State
  const [guessIndex, setGuessIndex] = useState(0);
  const [guessOptions, setGuessOptions] = useState<string[]>([]);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [guessResults, setGuessResults] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });

  const setupGuessQuestion = useCallback(
    (index: number) => {
      if (index >= events.length) return;
      const current = events[index];
      const otherDates = Array.from(
        new Set(events.filter((e) => e.date !== current.date).map((e) => e.date))
      );
      const wrongOptions = otherDates.sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [current.date, ...wrongOptions].sort(() => 0.5 - Math.random());
      setGuessOptions(options);
      setSelectedGuess(null);
    },
    [events]
  );

  const initOrderQuiz = useCallback(() => {
    if (events.length < 2) return;
    const shuffled = [...events].sort(() => 0.5 - Math.random()).slice(0, 5);
    setOrderItems(shuffled);
    setCheckedOrder(false);
    setOrderScore(null);
  }, [events]);

  const initGuessQuiz = useCallback(() => {
    if (events.length < 2) return;
    setGuessIndex(0);
    setGuessResults({ correct: 0, total: 0 });
    setSelectedGuess(null);
    setupGuessQuestion(0);
  }, [events, setupGuessQuestion]);

  useEffect(() => {
    if (mode === 'order') {
      initOrderQuiz();
    } else {
      initGuessQuiz();
    }
  }, [mode, initOrderQuiz, initGuessQuiz]);

  if (events.length < 2) {
    return (
      <div className="py-20 text-center text-text-secondary bg-white border border-border rounded-lg p-8">
        <HelpCircle size={32} className="mx-auto text-text-disabled mb-3" />
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Nicht genügend Ereignisse für den Lernmodus
        </h3>
        <p className="text-xs text-text-disabled max-w-sm mx-auto">
          Füge mindestens 2 Ereignisse zu deinem Zeitstrahl hinzu, um die chronologische Reihenfolge
          oder Datumsfragen zu trainieren.
        </p>
      </div>
    );
  }

  // Handle Order move item up/down
  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (checkedOrder) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= orderItems.length) return;
    const copy = [...orderItems];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setOrderItems(copy);
  };

  const handleCheckOrder = () => {
    const correctOrder = sortTimelineEvents(orderItems, true);
    let correctCount = 0;
    orderItems.forEach((item, idx) => {
      if (item.id === correctOrder[idx].id) {
        correctCount++;
      }
    });
    setOrderScore({ correct: correctCount, total: orderItems.length });
    setCheckedOrder(true);
  };

  const handleSelectGuess = (opt: string) => {
    if (selectedGuess !== null) return;
    setSelectedGuess(opt);
    const isCorrect = opt === events[guessIndex].date;
    setGuessResults((prev) => ({
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      total: prev.total + 1,
    }));
  };

  const handleNextGuess = () => {
    if (guessIndex + 1 < events.length) {
      const nextIdx = guessIndex + 1;
      setGuessIndex(nextIdx);
      setupGuessQuestion(nextIdx);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between bg-white border border-border p-2 rounded-lg">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMode('order')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'order'
                ? 'bg-text-primary text-text-inverse'
                : 'text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            Chronologie ordnen
          </button>
          <button
            onClick={() => setMode('guess')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'guess'
                ? 'bg-text-primary text-text-inverse'
                : 'text-text-secondary hover:bg-bg-secondary'
            }`}
          >
            Datum erraten
          </button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => (mode === 'order' ? initOrderQuiz() : initGuessQuiz())}
        >
          <RotateCcw size={12} /> Neu starten
        </Button>
      </div>

      {/* MODE 1: Chronology Ordering */}
      {mode === 'order' && (
        <div className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              Bringe die Ereignisse in die richtige Reihenfolge
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Sortiere von oben (ältestes Ereignis) nach unten (neuestes Ereignis).
            </p>
          </div>

          <div className="space-y-2">
            {orderItems.map((item, index) => {
              const correctOrder = sortTimelineEvents(orderItems, true);
              const isCorrectPos = checkedOrder && item.id === correctOrder[index].id;

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    checkedOrder
                      ? isCorrectPos
                        ? 'border-emerald-300 bg-emerald-50/60'
                        : 'border-rose-300 bg-rose-50/60'
                      : 'border-border bg-bg-secondary/40 hover:bg-bg-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center text-xs font-semibold text-text-secondary">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-text-primary">{item.title}</h4>
                      {checkedOrder && (
                        <span className="text-xs font-semibold text-accent mt-0.5 block">
                          Datum: {item.date} {item.endDate ? `– ${item.endDate}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {checkedOrder ? (
                      isCorrectPos ? (
                        <CheckCircle2 size={18} className="text-emerald-600" />
                      ) : (
                        <XCircle size={18} className="text-rose-600" />
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-30 rounded hover:bg-white"
                          title="Nach oben"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === orderItems.length - 1}
                          className="p-1 text-text-secondary hover:text-text-primary disabled:opacity-30 rounded hover:bg-white"
                          title="Nach unten"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {checkedOrder ? (
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" />
                <span className="text-xs font-medium text-text-primary">
                  Ergebnis: {orderScore?.correct} von {orderScore?.total} richtig platziert!
                </span>
              </div>
              <Button variant="primary" size="sm" onClick={initOrderQuiz}>
                Nächste Runde
              </Button>
            </div>
          ) : (
            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="primary" onClick={handleCheckOrder}>
                Reihenfolge prüfen
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Guess Date */}
      {mode === 'guess' && guessIndex < events.length && (
        <div className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-disabled">
              Frage {guessIndex + 1} von {events.length}
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              Punkte: {guessResults.correct} / {guessResults.total}
            </span>
          </div>

          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {events[guessIndex].title}
            </h3>
            {events[guessIndex].description && (
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                {events[guessIndex].description}
              </p>
            )}
            <p className="text-xs font-medium text-text-disabled mt-4">Wann fand dieses Ereignis statt?</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {guessOptions.map((opt, i) => {
              const isSelected = selectedGuess === opt;
              const isCorrect = opt === events[guessIndex].date;

              let btnStyle = 'border-border bg-white hover:bg-bg-secondary text-text-primary';
              if (selectedGuess !== null) {
                if (isCorrect) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 line-through';
                } else {
                  btnStyle = 'border-border bg-white opacity-50';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectGuess(opt)}
                  disabled={selectedGuess !== null}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {selectedGuess !== null && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <span className="text-xs">
                {selectedGuess === events[guessIndex].date ? (
                  <span className="text-emerald-600 font-medium">✓ Richtig! Sehr gut.</span>
                ) : (
                  <span className="text-rose-600 font-medium">
                    ✗ Leider falsch. Richtige Antwort: {events[guessIndex].date}
                  </span>
                )}
              </span>

              {guessIndex + 1 < events.length ? (
                <Button variant="primary" size="sm" onClick={handleNextGuess}>
                  Nächste Frage →
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={initGuessQuiz}>
                  Fertig! Nochmal spielen
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
