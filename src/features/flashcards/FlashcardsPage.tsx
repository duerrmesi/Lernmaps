import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  Play,
  Image as ImageIcon,
  Volume2,
  Tag,
  Search,
  Repeat,
} from 'lucide-react';
import { useStore, useFlashcardsByProject } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { Input } from '../../components/Input';
import { cn } from '../../utils/cn';
import type { Flashcard, OcclusionBox } from '../../types';
import { ImageOcclusionModal } from './ImageOcclusionModal';
import { speakText } from '../../utils/speech';

export const FlashcardsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, createFlashcard, updateFlashcard, deleteFlashcard } = useStore();
  const cards = useFlashcardsByProject(projectId || '');
  const project = projectId ? projects[projectId] : null;

  // Modals state
  const [showCreate, setShowCreate] = useState(false);
  const [showOcclusionModal, setShowOcclusionModal] = useState(false);

  // Standard Create state
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isReverse, setIsReverse] = useState(false);

  // Filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit state
  const [editCard, setEditCard] = useState<Flashcard | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');
  const [editIsReverse, setEditIsReverse] = useState(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [cards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (selectedTag && (!c.tags || !c.tags.includes(selectedTag))) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesFront = c.front.toLowerCase().includes(q);
        const matchesBack = c.back.toLowerCase().includes(q);
        const matchesTags = c.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesFront && !matchesBack && !matchesTags) return false;
      }
      return true;
    });
  }, [cards, selectedTag, searchQuery]);

  const handleCreate = () => {
    if (!front.trim() || !projectId) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    createFlashcard(projectId, front.trim(), back.trim(), {
      cardType: 'standard',
      tags,
      isReverse,
    });

    setFront('');
    setBack('');
    setTagsInput('');
    setIsReverse(false);
    setShowCreate(false);
  };

  const handleSaveOcclusion = (data: {
    front: string;
    back: string;
    imageUrl: string;
    occlusionBoxes: OcclusionBox[];
    tags: string[];
  }) => {
    if (!projectId) return;
    createFlashcard(projectId, data.front, data.back, {
      cardType: 'occlusion',
      imageUrl: data.imageUrl,
      occlusionBoxes: data.occlusionBoxes,
      tags: data.tags,
    });
  };

  const handleOpenEdit = (card: Flashcard) => {
    setEditCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditTagsInput(card.tags?.join(', ') || '');
    setEditIsReverse(!!card.isReverse);
  };

  const handleEditSave = () => {
    if (!editCard || !editFront.trim()) return;
    const tags = editTagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    updateFlashcard(editCard.id, {
      front: editFront.trim(),
      back: editBack.trim(),
      tags,
      isReverse: editIsReverse,
    });
    setEditCard(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Karteikarte löschen?')) deleteFlashcard(id);
  };

  const handleSpeak = (text: string) => {
    speakText(text);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        {project && (
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> {project.title}
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-text-primary tracking-tight">Karteikarten</h1>
            <p className="text-xs text-text-secondary mt-1">
              {cards.length} {cards.length === 1 ? 'Karte' : 'Karten'} insgesamt
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cards.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate(
                    `/projects/${projectId}/flashcards/learn${
                      selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : ''
                    }`
                  )
                }
              >
                <Play size={13} /> Lernen
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowOcclusionModal(true)}
              className="border-amber-300 hover:bg-amber-50 text-amber-900"
            >
              <ImageIcon size={13} className="text-amber-600" /> Bild-Okklusion
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={13} /> Neue Karte
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        {cards.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled"
              />
              <input
                type="text"
                placeholder="Karteikarten durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-bg-secondary border border-border rounded text-xs text-text-primary outline-none focus:border-accent"
              />
            </div>

            {/* Tag Pills */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-text-disabled flex items-center gap-1 mr-1">
                  <Tag size={11} /> Filter:
                </span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer',
                    selectedTag === null
                      ? 'bg-[#0D0D0D] text-white font-medium'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                  )}
                >
                  Alle ({cards.length})
                </button>
                {allTags.map((t) => {
                  const count = cards.filter((c) => c.tags?.includes(t)).length;
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTag(selectedTag === t ? null : t)}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer flex items-center gap-1',
                        selectedTag === t
                          ? 'bg-[#0D0D0D] text-white font-medium'
                          : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                      )}
                    >
                      #{t}
                      <span className="opacity-60 text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {cards.length === 0 ? (
          <EmptyState
            title="Noch keine Karteikarten"
            description="Erstelle deine erste Standard-Karteikarte oder erstelle eine interaktive Bild-Okklusion."
            action={
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => setShowCreate(true)}>
                  <Plus size={14} /> Karteikarte erstellen
                </Button>
                <Button variant="secondary" onClick={() => setShowOcclusionModal(true)}>
                  <ImageIcon size={14} /> Bild-Okklusion
                </Button>
              </div>
            }
          />
        ) : filteredCards.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-secondary border border-dashed border-border rounded-lg">
            Keine Karteikarten für diese Suche/Filter gefunden.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredCards.map((card) => {
              const isOcclusion = card.cardType === 'occlusion';
              return (
                <div
                  key={card.id}
                  className="border border-border rounded-lg p-4 hover:border-border-strong transition-all bg-white shadow-xs group"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Thumbnail if occlusion */}
                    {isOcclusion && card.imageUrl && (
                      <div className="w-16 h-16 rounded overflow-hidden border border-border bg-black/5 shrink-0">
                        <img
                          src={card.imageUrl}
                          alt="Occlusion preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Badges bar */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {isOcclusion && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            🖼️ Bild-Okklusion ({card.occlusionBoxes?.length || 0} Masken)
                          </span>
                        )}
                        {card.isReverse && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <Repeat size={10} /> Umkehrkarte
                          </span>
                        )}
                        {card.tags?.map((t) => (
                          <span
                            key={t}
                            onClick={() => setSelectedTag(t)}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-bg-secondary text-text-secondary hover:text-text-primary border border-border/60 cursor-pointer"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-text-primary flex-1 mb-1 leading-snug">
                          {card.front}
                        </p>
                        <button
                          onClick={() => handleSpeak(card.front)}
                          className="text-text-disabled hover:text-text-primary p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Frage vorlesen"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-start gap-2">
                        <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed flex-1">
                          {card.back}
                        </p>
                        <button
                          onClick={() => handleSpeak(card.back)}
                          className="text-text-disabled hover:text-text-primary p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Antwort vorlesen"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                        title="Karte bearbeiten"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(card.id)}
                        className="p-1.5 rounded text-text-secondary hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
                        title="Karte löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {card.reviewCount > 0 && (
                    <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                      <span className="text-[11px] text-text-disabled">
                        {card.reviewCount}× wiederholt
                      </span>
                      {card.difficulty && (
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                            card.difficulty === 'easy' && 'bg-success-light text-success',
                            card.difficulty === 'good' && 'bg-accent-light text-accent',
                            card.difficulty === 'hard' && 'bg-warning-light text-warning',
                            card.difficulty === 'again' && 'bg-danger-light text-danger'
                          )}
                        >
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
              );
            })}
          </div>
        )}
      </div>

      {/* Standard Create modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false);
          setFront('');
          setBack('');
          setTagsInput('');
          setIsReverse(false);
        }}
        title="Neue Standard-Karteikarte"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Frage / Begriff
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="z. B. Was versteht man unter Spaced Repetition?"
              rows={2}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-accent resize-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Antwort / Definition
            </label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Erklärung oder Lösung hier eingeben..."
              rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-disabled outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Tags (optional, kommagetrennt)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z. B. Definition, Klausur, Kapitel 1"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-primary">
            <input
              type="checkbox"
              checked={isReverse}
              onChange={(e) => setIsReverse(e.target.checked)}
              className="rounded accent-accent"
            />
            <span>
              <strong>Beidseitig lernen (Umkehrkarte):</strong> Auch Rückseite als Frage abfragen
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setFront('');
                setBack('');
              }}
            >
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!front.trim()}>
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editCard}
        onClose={() => setEditCard(null)}
        title="Karteikarte bearbeiten"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Frage / Begriff
            </label>
            <textarea
              value={editFront}
              onChange={(e) => setEditFront(e.target.value)}
              rows={2}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent resize-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Antwort / Lösung
            </label>
            <textarea
              value={editBack}
              onChange={(e) => setEditBack(e.target.value)}
              rows={3}
              className="w-full border border-border rounded px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Tags</label>
            <Input
              value={editTagsInput}
              onChange={(e) => setEditTagsInput(e.target.value)}
              placeholder="z. B. Definition, Klausur"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-primary">
            <input
              type="checkbox"
              checked={editIsReverse}
              onChange={(e) => setEditIsReverse(e.target.checked)}
              className="rounded accent-accent"
            />
            <span>Beidseitig lernen (Umkehrkarte)</span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setEditCard(null)}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleEditSave} disabled={!editFront.trim()}>
              Speichern
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Occlusion Creation Modal */}
      <ImageOcclusionModal
        isOpen={showOcclusionModal}
        onClose={() => setShowOcclusionModal(false)}
        onSave={handleSaveOcclusion}
      />
    </div>
  );
};
