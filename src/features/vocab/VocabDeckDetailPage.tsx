import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Play,
  RotateCcw,
  Volume2,
  Trash2,
  Edit2,
  Search,
  Upload,
  Calendar,
  Layers,
} from 'lucide-react';
import { useStore, useVocabDeck, useVocabItemsByDeck } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import { speakText } from '../../utils/speech';
import { BOX_CONFIG, PRESET_LANGUAGES, isVocabDue } from './vocabLeitner';
import type { VocabItem } from '../../types';

export const VocabDeckDetailPage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const deck = useVocabDeck(deckId);
  const items = useVocabItemsByDeck(deckId);

  const {
    createVocabItem,
    updateVocabItem,
    deleteVocabItem,
    batchCreateVocabItems,
    resetVocabItemProgress,
    resetDeckProgress,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<number | 'due' | null>(null);

  // Single Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabItem | null>(null);
  const [itemForeignWord, setItemForeignWord] = useState('');
  const [itemGermanWord, setItemGermanWord] = useState('');
  const [itemPhonetic, setItemPhonetic] = useState('');
  const [itemExampleSentence, setItemExampleSentence] = useState('');
  const [itemExampleTranslation, setItemExampleTranslation] = useState('');
  const [itemNotes, setItemNotes] = useState('');

  // Batch Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Language flag
  const langPreset = PRESET_LANGUAGES.find((p) => p.name === deck?.language);
  const flag = langPreset?.flag || '🌐';

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const due = items.filter((i) => isVocabDue(i)).length;
    const mastered = items.filter((i) => i.box === 5).length;

    const boxCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    items.forEach((i) => {
      boxCounts[i.box] = (boxCounts[i.box] || 0) + 1;
    });

    return { total, due, mastered, boxCounts };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Box filter
      if (selectedBoxFilter === 'due') {
        if (!isVocabDue(item)) return false;
      } else if (typeof selectedBoxFilter === 'number') {
        if (item.box !== selectedBoxFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.foreignWord.toLowerCase().includes(q) ||
          item.germanWord.toLowerCase().includes(q) ||
          (item.exampleSentence && item.exampleSentence.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));

        if (!match) return false;
      }

      return true;
    });
  }, [items, selectedBoxFilter, searchQuery]);

  if (!deck) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-text-secondary mb-4">Themenpaket wurde nicht gefunden.</p>
        <Button variant="secondary" onClick={() => navigate('/vocab')}>
          Zurück zur Übersicht
        </Button>
      </div>
    );
  }

  const handleSpeak = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    speakText(text, deck.langCode || 'en-US');
  };

  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemForeignWord('');
    setItemGermanWord('');
    setItemPhonetic('');
    setItemExampleSentence('');
    setItemExampleTranslation('');
    setItemNotes('');
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: VocabItem) => {
    setEditingItem(item);
    setItemForeignWord(item.foreignWord);
    setItemGermanWord(item.germanWord);
    setItemPhonetic(item.phonetic || '');
    setItemExampleSentence(item.exampleSentence || '');
    setItemExampleTranslation(item.exampleTranslation || '');
    setItemNotes(item.notes || '');
    setIsItemModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!itemForeignWord.trim() || !itemGermanWord.trim()) return;

    if (editingItem) {
      updateVocabItem(editingItem.id, {
        foreignWord: itemForeignWord.trim(),
        germanWord: itemGermanWord.trim(),
        phonetic: itemPhonetic.trim() || undefined,
        exampleSentence: itemExampleSentence.trim() || undefined,
        exampleTranslation: itemExampleTranslation.trim() || undefined,
        notes: itemNotes.trim() || undefined,
      });
    } else {
      createVocabItem(deck.id, itemForeignWord.trim(), itemGermanWord.trim(), {
        phonetic: itemPhonetic.trim() || undefined,
        exampleSentence: itemExampleSentence.trim() || undefined,
        exampleTranslation: itemExampleTranslation.trim() || undefined,
        notes: itemNotes.trim() || undefined,
      });
    }

    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: string, word: string) => {
    if (confirm(`Vokabel "${word}" löschen?`)) {
      deleteVocabItem(id);
    }
  };

  const handleBatchImport = () => {
    if (!importText.trim()) return;
    setImportError(null);

    const lines = importText.split('\n');
    const parsed: Array<{ foreignWord: string; germanWord: string; exampleSentence?: string; notes?: string }> = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      // Match separators: '=', '-', '\t', ';'
      let parts: string[] = [];
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (line.includes('=')) {
        parts = line.split('=');
      } else if (line.includes(' - ')) {
        parts = line.split(' - ');
      } else if (line.includes(';')) {
        parts = line.split(';');
      }

      if (parts.length >= 2) {
        const foreignWord = parts[0].trim();
        const germanWord = parts[1].trim();
        const notes = parts[2]?.trim() || undefined;

        if (foreignWord && germanWord) {
          parsed.push({ foreignWord, germanWord, notes });
        }
      }
    }

    if (parsed.length === 0) {
      setImportError('Keine gültigen Vokabel-Zeilen erkannt. Format: Fremdwort = Übersetzung');
      return;
    }

    batchCreateVocabItems(deck.id, parsed);
    setIsImportModalOpen(false);
    setImportText('');
  };

  const handleResetAllProgress = () => {
    if (
      confirm(
        `Möchtest du den gesamten Lernfortschritt für "${deck.title}" wirklich auf Box 1 (Neu) zurücksetzen?`
      )
    ) {
      resetDeckProgress(deck.id);
    }
  };

  const formatReviewDate = (item: VocabItem) => {
    if (isVocabDue(item)) {
      return <span className="text-red-500 font-semibold">Heute fällig</span>;
    }

    const reviewDate = new Date(item.nextReview);
    const diffDays = Math.ceil((reviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return <span className="text-amber-600">Morgen fällig</span>;
    return <span className="text-text-secondary">In {diffDays} Tagen</span>;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto scrollbar-thin">
      {/* Top Header */}
      <div className="border-b border-border bg-bg-canvas/80 backdrop-blur-xs sticky top-0 z-20 px-6 py-4">
        <div className="max-w-6xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/vocab')}
              className="p-1.5 rounded-lg border border-border bg-bg-canvas hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              title="Zurück zu allen Themenpaketen"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{flag}</span>
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-bg-secondary px-2 py-0.5 rounded border border-border">
                  {deck.language}
                </span>
                <h1 className="text-xl font-bold text-text-primary tracking-tight">{deck.title}</h1>
              </div>
              {deck.description && (
                <p className="text-xs text-text-secondary mt-0.5">{deck.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {stats.due > 0 ? (
              <Button
                variant="primary"
                onClick={() => navigate(`/vocab/${deck.id}/learn?filter=due`)}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
              >
                <Play size={14} fill="currentColor" />
                <span>Fällige lernen ({stats.due})</span>
              </Button>
            ) : null}

            {stats.total > 0 && (
              <Button
                variant={stats.due > 0 ? 'secondary' : 'primary'}
                onClick={() => navigate(`/vocab/${deck.id}/learn?filter=all`)}
                className={cn('gap-2', stats.due === 0 && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs')}
                title="Alle Vokabeln frei üben, auch wenn heute keine fällig sind"
              >
                <RotateCcw size={14} />
                <span>Freies Üben (Alle)</span>
              </Button>
            )}

            <Button variant="secondary" onClick={handleOpenCreateItem} className="gap-1.5">
              <Plus size={15} />
              <span>Vokabel hinzufügen</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => {
                setImportText('');
                setImportError(null);
                setIsImportModalOpen(true);
              }}
              className="gap-1.5"
              title="Mehrere Vokabeln auf einmal per Text/CSV einfügen"
            >
              <Upload size={14} />
              <span>Import</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-5">
        {/* Box Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-bg-secondary p-2.5 rounded-xl border border-border">
          <span className="text-xs font-semibold text-text-secondary px-2">Filter:</span>

          <button
            onClick={() => setSelectedBoxFilter(null)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
              selectedBoxFilter === null
                ? 'bg-bg-canvas text-text-primary shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            Alle ({stats.total})
          </button>

          <button
            onClick={() => setSelectedBoxFilter('due')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5',
              selectedBoxFilter === 'due'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            )}
          >
            <Calendar size={12} />
            <span>Fällig heute ({stats.due})</span>
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          {[1, 2, 3, 4, 5].map((boxNum) => {
            const cfg = BOX_CONFIG[boxNum];
            const count = stats.boxCounts[boxNum] || 0;
            const isSelected = selectedBoxFilter === boxNum;

            return (
              <button
                key={boxNum}
                onClick={() => setSelectedBoxFilter(isSelected ? null : boxNum)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5',
                  isSelected
                    ? 'bg-bg-canvas text-text-primary shadow-xs border border-indigo-500'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                )}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span>
                  {cfg.shortLabel} ({count})
                </span>
              </button>
            );
          })}

          {stats.total > 0 && (
            <button
              onClick={handleResetAllProgress}
              className="ml-auto text-xs text-text-disabled hover:text-amber-600 px-2 py-1 transition-colors cursor-pointer flex items-center gap-1"
              title="Alle Vokabeln dieses Pakets auf Box 1 zurücksetzen"
            >
              <RotateCcw size={12} />
              <span>Fortschritt zurücksetzen</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
            <input
              type="text"
              placeholder="In diesem Paket suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-bg-canvas text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-text-secondary">
            {filteredItems.length} von {items.length} {items.length === 1 ? 'Vokabel' : 'Vokabeln'}
          </div>
        </div>

        {/* Vocabulary List */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={<Layers size={32} strokeWidth={1.5} />}
            title={items.length === 0 ? 'Noch keine Vokabeln im Paket' : 'Keine passenden Vokabeln gefunden'}
            description={
              items.length === 0
                ? 'Füge deine erste Vokabel hinzu oder nutze den Schnell-Import, um eine Vokabelliste einzufügen.'
                : 'Passe die Filter oder deine Suche an.'
            }
            action={
              items.length === 0 ? (
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="primary" onClick={handleOpenCreateItem} className="gap-1.5 bg-indigo-600 text-white">
                    <Plus size={14} />
                    <span>Vokabel hinzufügen</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setIsImportModalOpen(true)} className="gap-1.5">
                    <Upload size={14} />
                    <span>Schnell-Import</span>
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-bg-canvas rounded-xl border border-border overflow-hidden shadow-xs divide-y divide-border">
            {filteredItems.map((item) => {
              const cfg = BOX_CONFIG[item.box] || BOX_CONFIG[1];

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-bg-hover transition-colors group"
                >
                  {/* Left Word Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text-primary tracking-tight">
                        {item.foreignWord}
                      </span>

                      <button
                        onClick={(e) => handleSpeak(item.foreignWord, e)}
                        className="p-1 rounded text-text-disabled hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                        title="Aussprache anhören"
                      >
                        <Volume2 size={13} />
                      </button>

                      {item.phonetic && (
                        <span className="text-xs text-text-disabled font-mono">[{item.phonetic}]</span>
                      )}

                      <span className="text-xs text-text-disabled">→</span>

                      <span className="text-sm font-medium text-text-primary">{item.germanWord}</span>

                      {item.notes && (
                        <span className="text-[10.5px] px-2 py-0.5 rounded bg-bg-secondary text-text-secondary border border-border">
                          {item.notes}
                        </span>
                      )}
                    </div>

                    {/* Example sentence */}
                    {item.exampleSentence && (
                      <div className="mt-1 text-xs text-text-secondary">
                        <span className="italic font-serif">„{item.exampleSentence}“</span>
                        {item.exampleTranslation && (
                          <span className="text-text-disabled ml-1.5">({item.exampleTranslation})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Box Status & Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {/* Leitner Box Tag */}
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border',
                          cfg.badgeClass
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span>{cfg.shortLabel}</span>
                      </span>

                      <div className="text-[11px] min-w-20 text-right">{formatReviewDate(item)}</div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => resetVocabItemProgress(item.id)}
                        className="p-1.5 rounded text-text-disabled hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                        title="Auf Box 1 zurücksetzen"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 rounded text-text-disabled hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.foreignWord)}
                        className="p-1.5 rounded text-text-disabled hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Single Vocab */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Vokabel bearbeiten' : 'Neue Vokabel hinzufügen'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Fremdwort ({deck.language}) <span className="text-red-500">*</span>
              </label>
              <Input
                value={itemForeignWord}
                onChange={(e) => setItemForeignWord(e.target.value)}
                placeholder="z. B. endeavor"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Deutsche Übersetzung <span className="text-red-500">*</span>
              </label>
              <Input
                value={itemGermanWord}
                onChange={(e) => setItemGermanWord(e.target.value)}
                placeholder="z. B. Bestreben, Bemühung"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Lautschrift / Aussprache (optional)
              </label>
              <Input
                value={itemPhonetic}
                onChange={(e) => setItemPhonetic(e.target.value)}
                placeholder="z. B. /ɪnˈdev.ər/"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-primary mb-1">
                Wortart / Notiz (optional)
              </label>
              <Input
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="z. B. Substantiv, n."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Beispielsatz ({deck.language}, optional)
            </label>
            <Input
              value={itemExampleSentence}
              onChange={(e) => setItemExampleSentence(e.target.value)}
              placeholder="z. B. It was an ambitious endeavor."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Übersetzung des Beispielsatzes (optional)
            </label>
            <Input
              value={itemExampleTranslation}
              onChange={(e) => setItemExampleTranslation(e.target.value)}
              placeholder="z. B. Es war ein ehrgeiziges Vorhaben."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setIsItemModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveItem}
              disabled={!itemForeignWord.trim() || !itemGermanWord.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {editingItem ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Schnell-Import */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="⚡ Schnell-Import von Vokabeln"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Füge hier deine Vokabeln zeilenweise ein. Unterstützte Trennzeichen zwischen Fremdwort und deutscher Übersetzung sind{' '}
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-text-primary font-mono">=</code>,{' '}
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-text-primary font-mono">-</code> oder{' '}
            <code className="bg-bg-tertiary px-1 py-0.5 rounded text-text-primary font-mono">Tabulator</code>.
          </p>

          <div className="bg-bg-secondary p-3 rounded-lg border border-border text-[11px] text-text-disabled font-mono space-y-0.5">
            <div># Beispiel:</div>
            <div>ubiquitous = allgegenwärtig</div>
            <div>resilient = widerstandsfähig</div>
            <div>acquire = erwerben, aneignen</div>
          </div>

          {importError && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-red-950/40 dark:border-red-900 dark:text-red-300">
              {importError}
            </div>
          )}

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            placeholder={`apple = Apfel\nbook = Buch\nhouse = Haus`}
            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-border bg-bg-canvas text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-indigo-500 resize-none"
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setIsImportModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleBatchImport}
              disabled={!importText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Vokabeln importieren
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
