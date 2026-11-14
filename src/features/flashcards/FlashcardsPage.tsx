import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, ArrowLeft, Play } from 'lucide-react';
import { useStore, useFlashcardsByProject } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import type { Flashcard } from '../../types';

export const FlashcardsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, createFlashcard, updateFlashcard, deleteFlashcard } = useStore();
  const cards = useFlashcardsByProject(projectId || '');
  const project = projectId ? projects[projectId] : null;

  const [showCreate, setShowCreate] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  const [editCard, setEditCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  const handleCreate = () => {
    if (!front.trim() || !projectId) return;
    createFlashcard(projectId, front.trim(), back.trim());
    setFront(''); setBack('');
    setShowCreate(false);
  };

  const handleEdit = () => {
    if (!editCard || !editFront.trim()) return;
    updateFlashcard(editCard.id, { front: editFront.trim(), back: editBack.trim() });
    setEditCard(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Karteikarte löschen?')) deleteFlashcard(id);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        {project && (
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> {project.title}
          </button>
        )}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-medium text-text-primary tracking-tight">Karteikarten</h1>
          <div className="flex gap-2">
            {cards.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/flashcards/learn`)}
              >
                <Play size={13} /> Lernen
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Neue Karte
            </Button>
          </div>
        </div>

        {cards.length === 0 ? (
          <EmptyState
            title="Noch keine Karteikarten"
            description="Erstelle deine erste Karteikarte, um mit dem Lernen zu beginnen."
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Karteikarte erstellen
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="border border-border rounded p-4 hover:border-border-strong transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary mb-1">{card.front}</p>
                    <p className="text-sm text-text-secondary">{card.back}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditCard(card); setEditFront(card.front); setEditBack(card.back); }}
                      className="p-1.5 rounded text-text-disabled hover:text-text-primary hover:bg-bg-secondary transition-colors"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1.5 rounded text-text-disabled hover:text-danger hover:bg-danger-light transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {card.reviewCount > 0 && (
                  <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                    <span className="text-xs text-text-disabled">{card.reviewCount}× wiederholt</span>
                    {card.difficulty && (
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        card.difficulty === 'easy' && 'bg-success-light text-success',
                        card.difficulty === 'good' && 'bg-accent-light text-accent',
                        card.difficulty === 'hard' && 'bg-warning-light text-warning',
                        card.difficulty === 'again' && 'bg-danger-light text-danger',
                      )}>
                        {{
                          easy: 'Einfach',
                          good: 'Gut',
                          hard: 'Schwierig',
                          again: 'Nochmal',
                        }[card.difficulty]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setFront(''); setBack(''); }} title="Neue Karteikarte" size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Frage / Begriff</label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Was passiert in der Prophase?"
              rows={2}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-accent resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Antwort / Definition</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Chromosomen kondensieren, Kernhülle löst sich auf…"
              rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setFront(''); setBack(''); }}>Abbrechen</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!front.trim()}>Erstellen</Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editCard} onClose={() => setEditCard(null)} title="Karteikarte bearbeiten" size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Frage / Begriff</label>
            <textarea
              value={editFront}
              onChange={(e) => setEditFront(e.target.value)}
              rows={2}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1">Antwort</label>
            <textarea
              value={editBack}
              onChange={(e) => setEditBack(e.target.value)}
              rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditCard(null)}>Abbrechen</Button>
            <Button variant="primary" onClick={handleEdit} disabled={!editFront.trim()}>Speichern</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
