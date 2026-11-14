import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, CheckCircle } from 'lucide-react';
import { useStore, useFlashcardsByProject } from '../../store';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import { now } from '../../utils';
import type { FlashcardDifficulty } from '../../types';

type LearnDifficulty = FlashcardDifficulty;

export const LearnMode: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, updateFlashcard } = useStore();
  const allCards = useFlashcardsByProject(projectId || '');
  const project = projectId ? projects[projectId] : null;

  const [cards] = useState(() => [...allCards].sort(() => Math.random() - 0.5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [finished, setFinished] = useState(false);

  const currentCard = cards[currentIndex];
  const progress = currentIndex / cards.length;

  const handleAnswer = useCallback((difficulty: LearnDifficulty) => {
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
      setRevealed(false);
    }
  }, [currentCard, currentIndex, cards.length, updateFlashcard]);

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <p className="text-text-secondary">Keine Karteikarten vorhanden.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>Zurück</Button>
      </div>
    );
  }

  if (finished) {
    const total = cards.length;
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-sm w-full text-center px-8">
          <CheckCircle size={40} className="text-success mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-medium text-text-primary mb-1">Lerneinheit abgeschlossen</h2>
          <p className="text-sm text-text-secondary mb-8">{total} Karten durchgegangen</p>

          <div className="grid grid-cols-4 gap-2 mb-8">
            <StatBox label="Nochmal" value={sessionStats.again} color="danger" />
            <StatBox label="Schwer" value={sessionStats.hard} color="warning" />
            <StatBox label="Gut" value={sessionStats.good} color="accent" />
            <StatBox label="Einfach" value={sessionStats.easy} color="success" />
          </div>

          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => navigate(`/projects/${projectId}/flashcards`)}>
              Zur Übersicht
            </Button>
            <Button variant="primary" onClick={() => { setCurrentIndex(0); setRevealed(false); setFinished(false); setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 }); }}>
              <RotateCcw size={13} /> Nochmals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border">
        <button
          onClick={() => navigate(`/projects/${projectId}/flashcards`)}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> {project?.title || 'Zurück'}
        </button>
        <span className="text-sm text-text-secondary">
          {currentIndex + 1} / {cards.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg-tertiary shrink-0">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-lg">
          {/* Card */}
          <div className="border border-border rounded-lg p-8 min-h-[200px] flex flex-col">
            <span className="text-xs text-text-disabled uppercase tracking-wider mb-4">Frage</span>
            <p className="text-lg text-text-primary font-medium leading-relaxed flex-1">
              {currentCard?.front}
            </p>
          </div>

          {/* Reveal */}
          {!revealed ? (
            <div className="mt-4 text-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setRevealed(true)}
                className="px-8"
              >
                Antwort aufdecken
              </Button>
            </div>
          ) : (
            <>
              {/* Answer */}
              <div className="mt-3 border border-border-strong rounded-lg p-6 bg-bg-secondary">
                <span className="text-xs text-text-disabled uppercase tracking-wider mb-3 block">Antwort</span>
                <p className="text-ui text-text-primary leading-relaxed">
                  {currentCard?.back}
                </p>
              </div>

              {/* Rating buttons */}
              <div className="mt-6 grid grid-cols-4 gap-2">
                <DifficultyButton
                  label="Nochmal"
                  sublabel="< 1 Min"
                  color="danger"
                  onClick={() => handleAnswer('again')}
                />
                <DifficultyButton
                  label="Schwierig"
                  sublabel="~ 10 Min"
                  color="warning"
                  onClick={() => handleAnswer('hard')}
                />
                <DifficultyButton
                  label="Gut"
                  sublabel="1–2 Tage"
                  color="accent"
                  onClick={() => handleAnswer('good')}
                />
                <DifficultyButton
                  label="Einfach"
                  sublabel="4+ Tage"
                  color="success"
                  onClick={() => handleAnswer('easy')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface DifficultyButtonProps {
  label: string;
  sublabel: string;
  color: 'danger' | 'warning' | 'accent' | 'success';
  onClick: () => void;
}

const colorMap = {
  danger: 'border-danger/30 hover:bg-danger-light hover:border-danger text-danger',
  warning: 'border-warning/30 hover:bg-warning-light hover:border-warning text-warning',
  accent: 'border-accent/30 hover:bg-accent-light hover:border-accent text-accent',
  success: 'border-success/30 hover:bg-success-light hover:border-success text-success',
};

const DifficultyButton: React.FC<DifficultyButtonProps> = ({ label, sublabel, color, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-0.5 py-2.5 px-3 rounded border transition-colors',
      colorMap[color]
    )}
  >
    <span className="text-sm font-medium">{label}</span>
    <span className="text-xs opacity-70">{sublabel}</span>
  </button>
);

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, color }) => (
  <div className={cn('rounded p-3 text-center', {
    'bg-danger-light text-danger': color === 'danger',
    'bg-warning-light text-warning': color === 'warning',
    'bg-accent-light text-accent': color === 'accent',
    'bg-success-light text-success': color === 'success',
  })}>
    <p className="text-2xl font-medium">{value}</p>
    <p className="text-xs mt-0.5 opacity-80">{label}</p>
  </div>
);
