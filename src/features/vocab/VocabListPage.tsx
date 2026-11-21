import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Languages,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  Search,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useStore, useVocabDecks, useAllVocabItems } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import { BOX_CONFIG, PRESET_LANGUAGES, isVocabDue } from './vocabLeitner';
import type { VocabDeck } from '../../types';

export const VocabListPage: React.FC = () => {
  const navigate = useNavigate();
  const { createVocabDeck, updateVocabDeck, deleteVocabDeck, batchCreateVocabItems } = useStore();
  const decks = useVocabDecks();
  const allItems = useAllVocabItems();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<number | null>(null);

  // Deck Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState<VocabDeck | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalLanguage, setModalLanguage] = useState('Englisch');
  const [modalLangCode, setModalLangCode] = useState('en-US');
  const [modalDescription, setModalDescription] = useState('');
  const [modalColor, setModalColor] = useState('indigo');

  // Overall Statistics
  const stats = useMemo(() => {
    const total = allItems.length;
    const due = allItems.filter((i) => isVocabDue(i)).length;
    const mastered = allItems.filter((i) => i.box === 5).length;

    const boxCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allItems.forEach((i) => {
      boxCounts[i.box] = (boxCounts[i.box] || 0) + 1;
    });

    return { total, due, mastered, boxCounts };
  }, [allItems]);

  // Filtered decks
  const filteredDecks = useMemo(() => {
    return decks.filter((d) => {
      const matchQuery =
        !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchQuery;
    });
  }, [decks, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingDeck(null);
    setModalTitle('');
    setModalLanguage('Englisch');
    setModalLangCode('en-US');
    setModalDescription('');
    setModalColor('indigo');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (deck: VocabDeck, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDeck(deck);
    setModalTitle(deck.title);
    setModalLanguage(deck.language);
    setModalLangCode(deck.langCode || 'en-US');
    setModalDescription(deck.description || '');
    setModalColor(deck.color || 'indigo');
    setIsModalOpen(true);
  };

  const handleSaveDeck = () => {
    if (!modalTitle.trim()) return;

    if (editingDeck) {
      updateVocabDeck(editingDeck.id, {
        title: modalTitle.trim(),
        language: modalLanguage.trim(),
        langCode: modalLangCode,
        description: modalDescription.trim(),
        color: modalColor,
      });
    } else {
      createVocabDeck(
        modalTitle.trim(),
        modalLanguage.trim(),
        modalDescription.trim(),
        modalLangCode,
        modalColor
      );
    }
    setIsModalOpen(false);
  };

  const handleDeleteDeck = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Möchtest du das Themenpaket "${title}" samt allen enthaltenen Vokabeln wirklich löschen?`)) {
      deleteVocabDeck(id);
    }
  };

  const handleLanguagePresetChange = (name: string) => {
    const preset = PRESET_LANGUAGES.find((p) => p.name === name);
    setModalLanguage(name);
    if (preset) {
      setModalLangCode(preset.code);
    }
  };

  const handleCreateSampleDeck = () => {
    const deck = createVocabDeck(
      'Englisch Grundwortschatz & Alltagsbegriffe',
      'Englisch',
      'Wichtige englische Vokabeln für den Einstieg',
      'en-US',
      'indigo'
    );

    const sampleWords = [
      { foreignWord: 'ubiquitous', germanWord: 'allgegenwärtig, überall vorhanden', exampleSentence: 'Smartphones are now ubiquitous in modern life.', notes: 'Adjektiv' },
      { foreignWord: 'resilient', germanWord: 'widerstandsfähig, belastbar', exampleSentence: 'She remained resilient in the face of difficulties.', notes: 'Adjektiv' },
      { foreignWord: 'acquire', germanWord: 'erwerben, aneignen', exampleSentence: 'He managed to acquire good language skills.', notes: 'Verb' },
      { foreignWord: 'reliable', germanWord: 'zuverlässig, verlässlich', exampleSentence: 'We need a reliable internet connection.', notes: 'Adjektiv' },
      { foreignWord: 'endeavor', germanWord: 'Bestreben, Anstrengung, Bemühung', exampleSentence: 'We wish you success in your new endeavor.', notes: 'Substantiv' },
      { foreignWord: 'convey', germanWord: 'übermitteln, vermitteln', exampleSentence: 'Words cannot convey how grateful I am.', notes: 'Verb' },
      { foreignWord: 'essential', germanWord: 'wesentlich, grundlegend, unverzichtbar', exampleSentence: 'Water is essential for all living beings.', notes: 'Adjektiv' },
      { foreignWord: 'clarify', germanWord: 'aufklären, verdeutlichen, klarstellen', exampleSentence: 'Could you please clarify that point?', notes: 'Verb' },
    ];

    batchCreateVocabItems(deck.id, sampleWords);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas overflow-y-auto scrollbar-thin">
      {/* Header Banner */}
      <div className="border-b border-border bg-bg-canvas/80 backdrop-blur-xs sticky top-0 z-20 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-900 dark:text-indigo-400">
                <Languages size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary tracking-tight">Vokabeltrainer</h1>
                <p className="text-xs text-text-secondary">
                  Repetitive Learning & Spaced Repetition nach dem Leitner-Kästchen-System (Box 1–5)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stats.due > 0 ? (
              <Button
                variant="primary"
                onClick={() => navigate('/vocab/learn?filter=due')}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
              >
                <Play size={14} fill="currentColor" />
                <span>Fällige lernen ({stats.due})</span>
              </Button>
            ) : null}

            {stats.total > 0 && (
              <Button
                variant={stats.due > 0 ? 'secondary' : 'primary'}
                onClick={() => navigate('/vocab/learn?filter=all')}
                className={cn('gap-2', stats.due === 0 && 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs')}
                title="Alle Vokabeln frei üben, auch wenn heute keine fällig sind"
              >
                <RotateCcw size={14} />
                <span>Freies Üben (Alle)</span>
              </Button>
            )}

            <Button variant="secondary" onClick={handleOpenCreateModal} className="gap-1.5">
              <Plus size={15} />
              <span>Neues Themenpaket</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Leitner Box Overview Dashboard */}
        <div className="bg-bg-secondary rounded-xl p-4 border border-border shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                Lernfortschritt (Leitner-Kästchen)
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>
                Gesamt: <strong className="text-text-primary">{stats.total}</strong>
              </span>
              <span>
                Heute fällig:{' '}
                <strong className={stats.due > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-text-primary'}>
                  {stats.due}
                </strong>
              </span>
              <span>
                Gemeistert: <strong className="text-emerald-600 dark:text-emerald-400">{stats.mastered}</strong>
              </span>
            </div>
          </div>

          {/* Box Progress Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[1, 2, 3, 4, 5].map((boxNum) => {
              const cfg = BOX_CONFIG[boxNum];
              const count = stats.boxCounts[boxNum] || 0;
              const isSelected = selectedBoxFilter === boxNum;

              return (
                <button
                  key={boxNum}
                  onClick={() => setSelectedBoxFilter(isSelected ? null : boxNum)}
                  className={cn(
                    'p-2.5 rounded-lg border text-left transition-all cursor-pointer relative overflow-hidden',
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-bg-canvas shadow-xs'
                      : 'border-border bg-bg-canvas hover:border-border-strong hover:bg-bg-hover'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-text-secondary">{cfg.shortLabel}</span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                      title={cfg.label}
                    />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-text-primary">{count}</span>
                    <span className="text-[10px] text-text-disabled">{cfg.intervalDays} {cfg.intervalDays === 1 ? 'Tag' : 'Tage'}</span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-1 mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: cfg.color,
                        width: stats.total > 0 ? `${(count / stats.total) * 100}%` : '0%',
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedBoxFilter && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-secondary">
                Filter aktiv: <strong>{BOX_CONFIG[selectedBoxFilter]?.label}</strong> ({stats.boxCounts[selectedBoxFilter] || 0} Vokabeln)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate(`/vocab/learn?box=${selectedBoxFilter}`)}
                  className="gap-1.5 h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Play size={12} fill="currentColor" />
                  <span>Nur {BOX_CONFIG[selectedBoxFilter]?.shortLabel} üben</span>
                </Button>
                <button
                  onClick={() => setSelectedBoxFilter(null)}
                  className="text-xs text-text-disabled hover:text-text-primary cursor-pointer px-2 py-1"
                >
                  Filter aufheben
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled" />
            <input
              type="text"
              placeholder="Themenpakete durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-bg-canvas text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="text-xs text-text-secondary self-start sm:self-auto">
            {filteredDecks.length} {filteredDecks.length === 1 ? 'Themenpaket' : 'Themenpakete'}
          </div>
        </div>

        {/* Decks Grid */}
        {filteredDecks.length === 0 ? (
          <EmptyState
            icon={<Languages size={32} strokeWidth={1.5} />}
            title={decks.length === 0 ? 'Noch keine Themenpakete vorhanden' : 'Keine passenden Themenpakete gefunden'}
            description={
              decks.length === 0
                ? 'Erstelle dein erstes Themenpaket oder lade Beispieldaten, um sofort mit dem Vokabeltraining zu starten.'
                : 'Passe deinen Suchbegriff an, um andere Pakete zu finden.'
            }
            action={
              decks.length === 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-4">
                  <Button variant="primary" onClick={handleOpenCreateModal} className="gap-1.5 bg-indigo-600 text-white">
                    <Plus size={14} />
                    <span>Themenpaket erstellen</span>
                  </Button>
                  <Button variant="secondary" onClick={handleCreateSampleDeck} className="gap-1.5">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Beispiel-Vokabeln laden</span>
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDecks.map((deck) => {
              const deckItems = allItems.filter((i) => i.deckId === deck.id);
              const deckDue = deckItems.filter((i) => isVocabDue(i)).length;
              const deckMastered = deckItems.filter((i) => i.box === 5).length;
              const progressPct = deckItems.length > 0 ? Math.round((deckMastered / deckItems.length) * 100) : 0;

              const langPreset = PRESET_LANGUAGES.find((p) => p.name === deck.language);
              const flag = langPreset?.flag || '🌐';

              return (
                <div
                  key={deck.id}
                  onClick={() => navigate(`/vocab/${deck.id}`)}
                  className="group relative bg-bg-canvas rounded-xl border border-border hover:border-indigo-300 dark:hover:border-indigo-800 p-4 transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none" title={deck.language}>
                          {flag}
                        </span>
                        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-bg-secondary px-2 py-0.5 rounded border border-border">
                          {deck.language}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleOpenEditModal(deck, e)}
                          className="p-1.5 rounded hover:bg-bg-tertiary text-text-disabled hover:text-text-primary transition-colors"
                          title="Themenpaket bearbeiten"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDeck(deck.id, deck.title, e)}
                          className="p-1.5 rounded hover:bg-red-50 text-text-disabled hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                          title="Themenpaket löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-base font-semibold text-text-primary group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {deck.title}
                    </h3>
                    {deck.description ? (
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{deck.description}</p>
                    ) : (
                      <p className="text-xs text-text-disabled mt-1 italic">Keine Beschreibung</p>
                    )}
                  </div>

                  {/* Bottom Stats & Action */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-text-secondary">
                        <strong>{deckItems.length}</strong> {deckItems.length === 1 ? 'Vokabel' : 'Vokabeln'}
                      </span>
                      {deckDue > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                          <Calendar size={11} />
                          {deckDue} fällig
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 size={12} />
                          Alles gelernt
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden mb-3">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={deckDue > 0 ? 'primary' : 'secondary'}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vocab/${deck.id}/learn?filter=${deckDue > 0 ? 'due' : 'all'}`);
                        }}
                        className={cn(
                          'flex-1 gap-1.5 h-8 text-xs',
                          deckDue > 0 && 'bg-indigo-600 hover:bg-indigo-700 text-white font-medium'
                        )}
                      >
                        <Play size={12} fill="currentColor" />
                        <span>{deckDue > 0 ? `Lernen (${deckDue})` : 'Frei üben'}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/vocab/${deck.id}`);
                        }}
                        className="h-8 px-2.5 text-xs text-text-secondary hover:text-text-primary"
                        title="Vokabelliste öffnen"
                      >
                        <ArrowRight size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create or Edit Deck */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDeck ? 'Themenpaket bearbeiten' : 'Neues Themenpaket anlegen'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Titel des Themenpakets <span className="text-red-500">*</span>
            </label>
            <Input
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              placeholder="z. B. Spanisch Grundwortschatz Lektion 1"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Fremdsprache (für automatische Audio-Aussprache)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {PRESET_LANGUAGES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleLanguagePresetChange(preset.name)}
                  className={cn(
                    'flex items-center gap-1.5 p-2 rounded-lg border text-xs text-left transition-colors cursor-pointer',
                    modalLanguage === preset.name
                      ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 font-medium dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-border bg-bg-canvas hover:bg-bg-hover text-text-secondary'
                  )}
                >
                  <span className="text-base leading-none">{preset.flag}</span>
                  <span className="truncate">{preset.name}</span>
                </button>
              ))}
            </div>

            <Input
              value={modalLanguage}
              onChange={(e) => setModalLanguage(e.target.value)}
              placeholder="Eigene Sprache eingeben (z. B. Portugiesisch)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1">
              Beschreibung (optional)
            </label>
            <textarea
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              placeholder="Worum geht es in diesem Themenpaket?"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-bg-canvas text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveDeck}
              disabled={!modalTitle.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              {editingDeck ? 'Speichern' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
