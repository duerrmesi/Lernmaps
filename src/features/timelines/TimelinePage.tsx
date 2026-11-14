import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Milestone,
  Plus,
  ArrowUpDown,
  Search,
  Download,
  Printer,
  Edit2,
  Trash2,
  LayoutList,
  Rows,
  Columns,
  GraduationCap,
} from 'lucide-react';
import { useStore, useTimeline, useTimelineEventsByTimeline } from '../../store';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Modal } from '../../components/Modal';
import { TimelineEventModal } from './TimelineEventModal';
import { TimelineHorizontalView } from './TimelineHorizontalView';
import { TimelineVerticalView } from './TimelineVerticalView';
import { TimelineTableView } from './TimelineTableView';
import { TimelineQuizView } from './TimelineQuizView';
import { sortTimelineEvents } from './timelineUtils';
import type { TimelineEvent } from '../../types';

type ViewMode = 'horizontal' | 'vertical' | 'table' | 'quiz';

export const TimelinePage: React.FC = () => {
  const { projectId, timelineId } = useParams<{ projectId: string; timelineId: string }>();
  const navigate = useNavigate();

  const {
    projects,
    updateTimeline,
    deleteTimeline,
    createTimelineEvent,
    updateTimelineEvent,
    deleteTimelineEvent,
  } = useStore();

  const timeline = useTimeline(timelineId || '');
  const rawEvents = useTimelineEventsByTimeline(timelineId || '');
  const project = projectId ? projects[projectId] : null;

  // View & Filter states
  const [viewMode, setViewMode] = useState<ViewMode>('horizontal');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImportance, setSelectedImportance] = useState<string>('all');
  const [sortAscending, setSortAscending] = useState(true);

  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [showEditTimeline, setShowEditTimeline] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Categories list derived from events
  const categories = useMemo(() => {
    const set = new Set<string>();
    rawEvents.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [rawEvents]);

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    let list = rawEvents;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.date.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category === selectedCategory);
    }

    if (selectedImportance !== 'all') {
      list = list.filter((e) => e.importance === selectedImportance);
    }

    return sortTimelineEvents(list, sortAscending);
  }, [rawEvents, searchQuery, selectedCategory, selectedImportance, sortAscending]);

  if (!timeline || !projectId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-text-secondary text-sm mb-4">Zeitstrahl nicht gefunden.</p>
        <Button variant="secondary" onClick={() => navigate(projectId ? `/projects/${projectId}` : '/')}>
          Zurück
        </Button>
      </div>
    );
  }

  const handleSaveEvent = (data: {
    title: string;
    description: string;
    date: string;
    endDate?: string;
    category?: string;
    color?: string;
    importance: import('../../types').TimelineEventImportance;
  }) => {
    if (editingEvent) {
      updateTimelineEvent(editingEvent.id, data);
    } else {
      createTimelineEvent(timeline.id, projectId, data);
    }
    setEditingEvent(null);
  };

  const handleDeleteTimeline = () => {
    if (window.confirm('Diesen Zeitstrahl und alle seine Ereignisse wirklich löschen?')) {
      deleteTimeline(timeline.id);
      navigate(`/projects/${projectId}`);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ timeline, events: rawEvents }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${timeline.title.replace(/\s+/g, '_')}_zeitstrahl.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg-canvas">
      {/* Top Header Bar */}
      <header className="border-b border-border bg-white px-6 py-3 shrink-0 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-[11px] text-text-disabled mb-1">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="hover:text-text-secondary transition-colors"
              >
                {project?.title || 'Projekt'}
              </button>
              <span>/</span>
              <span>Zeitstrahl</span>
            </div>

            {/* Title & Desc */}
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-bg-tertiary text-text-primary">
                <Milestone size={16} strokeWidth={2.2} />
              </div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">
                {timeline.title}
              </h1>
              <button
                onClick={() => {
                  setEditTitle(timeline.title);
                  setEditDesc(timeline.description || '');
                  setShowEditTimeline(true);
                }}
                className="p-1 text-text-disabled hover:text-text-primary rounded hover:bg-bg-secondary transition-colors"
                title="Zeitstrahl umbenennen / bearbeiten"
              >
                <Edit2 size={12} />
              </button>
            </div>
            {timeline.description && (
              <p className="text-[12px] text-text-secondary mt-0.5 line-clamp-1">
                {timeline.description}
              </p>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportJson}
              title="Als JSON exportieren"
            >
              <Download size={12} /> Export
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              title="Drucken / PDF"
            >
              <Printer size={12} /> Drucken
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingEvent(null);
                setShowEventModal(true);
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> Ereignis hinzufügen
            </Button>
          </div>
        </div>

        {/* View mode switcher & quick stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-border/70">
          <div className="flex items-center gap-1 bg-bg-secondary p-0.5 rounded-md border border-border/80">
            <button
              onClick={() => setViewMode('horizontal')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'horizontal'
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Columns size={13} />
              <span>Horizontale Achse</span>
            </button>
            <button
              onClick={() => setViewMode('vertical')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'vertical'
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Rows size={13} />
              <span>Vertikaler Fluss</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <LayoutList size={13} />
              <span>Tabelle</span>
            </button>
            <button
              onClick={() => setViewMode('quiz')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'quiz'
                  ? 'bg-white text-accent font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <GraduationCap size={13} />
              <span>Lernmodus & Quiz</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-disabled">
            <span>
              {rawEvents.length} {rawEvents.length === 1 ? 'Ereignis' : 'Ereignisse'}
            </span>
            <span>•</span>
            <button
              onClick={handleDeleteTimeline}
              className="text-text-disabled hover:text-danger flex items-center gap-1 transition-colors"
              title="Zeitstrahl löschen"
            >
              <Trash2 size={12} /> Löschen
            </button>
          </div>
        </div>
      </header>

      {/* Filter / Search Bar (Only for visualizer/table modes) */}
      {viewMode !== 'quiz' && (
        <div className="bg-white/70 backdrop-blur-xs border-b border-border px-6 py-2 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
            <div className="relative w-full">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-disabled"
              />
              <input
                type="text"
                placeholder="Ereignisse durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-7 pr-3 py-1 rounded bg-bg-secondary border border-border text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-border-strong"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-text-disabled">Kategorie:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs px-2 py-1 rounded bg-bg-secondary border border-border text-text-secondary focus:outline-none"
                >
                  <option value="all">Alle Kategorien</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Importance filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-text-disabled">Filter:</span>
              <select
                value={selectedImportance}
                onChange={(e) => setSelectedImportance(e.target.value)}
                className="text-xs px-2 py-1 rounded bg-bg-secondary border border-border text-text-secondary focus:outline-none"
              >
                <option value="all">Alle Wichtigkeiten</option>
                <option value="high">Nur Schlüsselereignisse</option>
                <option value="medium">Wichtig & Schlüssel</option>
                <option value="low">Nur Details</option>
              </select>
            </div>

            {/* Sort Order */}
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-bg-secondary border border-border text-text-secondary hover:text-text-primary transition-colors"
              title={sortAscending ? 'Chronologisch (Älteste zuerst)' : 'Umgekehrt (Neueste zuerst)'}
            >
              <ArrowUpDown size={11} />
              <span>{sortAscending ? 'Älteste zuerst' : 'Neueste zuerst'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {rawEvents.length === 0 ? (
          <div className="max-w-md mx-auto my-16 bg-white border border-border rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-bg-secondary text-accent mx-auto flex items-center justify-center mb-4">
              <Milestone size={24} />
            </div>
            <h2 className="text-base font-semibold text-text-primary mb-1">
              Dein Zeitstrahl ist noch leer
            </h2>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Halte historische Meilensteine, historische Epochen, naturwissenschaftliche Entdeckungen
              oder Abläufe chronologisch fest.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setEditingEvent(null);
                setShowEventModal(true);
              }}
            >
              <Plus size={13} strokeWidth={2.5} /> Erstes Ereignis hinzufügen
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'horizontal' && (
              <TimelineHorizontalView
                events={filteredEvents}
                onEdit={(ev) => {
                  setEditingEvent(ev);
                  setShowEventModal(true);
                }}
                onDelete={(id) => {
                  if (window.confirm('Ereignis wirklich entfernen?')) {
                    deleteTimelineEvent(id);
                  }
                }}
              />
            )}

            {viewMode === 'vertical' && (
              <TimelineVerticalView
                events={filteredEvents}
                onEdit={(ev) => {
                  setEditingEvent(ev);
                  setShowEventModal(true);
                }}
                onDelete={(id) => {
                  if (window.confirm('Ereignis wirklich entfernen?')) {
                    deleteTimelineEvent(id);
                  }
                }}
              />
            )}

            {viewMode === 'table' && (
              <TimelineTableView
                events={filteredEvents}
                onEdit={(ev) => {
                  setEditingEvent(ev);
                  setShowEventModal(true);
                }}
                onDelete={(id) => {
                  if (window.confirm('Ereignis wirklich entfernen?')) {
                    deleteTimelineEvent(id);
                  }
                }}
              />
            )}

            {viewMode === 'quiz' && <TimelineQuizView events={rawEvents} />}
          </>
        )}
      </main>

      {/* Add / Edit Event Modal */}
      <TimelineEventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        initialData={editingEvent}
      />

      {/* Edit Timeline Modal */}
      <Modal
        isOpen={showEditTimeline}
        onClose={() => setShowEditTimeline(false)}
        title="Zeitstrahl bearbeiten"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
          />
          <Input
            label="Beschreibung (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className="flex justify-end gap-1.5 pt-2">
            <Button variant="secondary" onClick={() => setShowEditTimeline(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              disabled={!editTitle.trim()}
              onClick={() => {
                updateTimeline(timeline.id, {
                  title: editTitle.trim(),
                  description: editDesc.trim(),
                });
                setShowEditTimeline(false);
              }}
            >
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
