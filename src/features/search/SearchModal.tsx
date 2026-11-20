import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Network, CreditCard, StickyNote, Layers, FolderOpen, Milestone, FileText, Folder } from 'lucide-react';
import { useSearchStore } from './searchStore';
import { useStore } from '../../store';
import { usePDFViewerStore } from '../../store/pdfViewerStore';
import { fuzzyMatch, truncate } from '../../utils';
import type { SearchResult } from '../../types';
import { cn } from '../../utils/cn';

const TYPE_LABELS: Record<string, string> = {
  project: 'Projekt',
  mindmap: 'Mindmap',
  node: 'Knoten',
  note: 'Notiz',
  flashcard: 'Karteikarte',
  taskcard: 'Taskcard',
  timeline: 'Zeitstrahl',
  timelineEvent: 'Ereignis',
  document: 'PDF-Dokument',
  folder: 'Ordner',
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  project: FolderOpen,
  mindmap: Network,
  node: Network,
  note: StickyNote,
  flashcard: CreditCard,
  taskcard: Layers,
  timeline: Milestone,
  timelineEvent: Milestone,
  document: FileText,
  folder: Folder,
};

function useSearchResults(query: string): SearchResult[] {
  const store = useStore();

  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const q = query.toLowerCase();

  Object.values(store.projects).forEach((p) => {
    if (fuzzyMatch(p.title, q) || fuzzyMatch(p.description, q)) {
      results.push({ id: p.id, type: 'project', title: p.title });
    }
  });

  Object.values(store.mindmaps).forEach((m) => {
    if (fuzzyMatch(m.title, q)) {
      const project = store.projects[m.projectId];
      results.push({ id: m.id, type: 'mindmap', title: m.title, subtitle: project?.title, projectId: m.projectId });
    }
  });

  Object.values(store.mindmapNodes).forEach((n) => {
    if (fuzzyMatch(n.title, q) || fuzzyMatch(n.content, q)) {
      const mindmap = store.mindmaps[n.mindmapId];
      results.push({ id: n.id, type: 'node', title: n.title, subtitle: mindmap?.title, projectId: n.projectId });
    }
  });

  Object.values(store.notes).forEach((n) => {
    if (fuzzyMatch(n.title, q) || fuzzyMatch(n.content, q)) {
      const project = store.projects[n.projectId];
      results.push({ id: n.id, type: 'note', title: n.title, subtitle: project?.title, projectId: n.projectId });
    }
  });

  Object.values(store.flashcards).forEach((f) => {
    if (fuzzyMatch(f.front, q) || fuzzyMatch(f.back, q)) {
      const project = store.projects[f.projectId];
      results.push({ id: f.id, type: 'flashcard', title: truncate(f.front, 60), subtitle: project?.title, projectId: f.projectId });
    }
  });

  Object.values(store.taskcards).forEach((t) => {
    if (fuzzyMatch(t.title, q) || fuzzyMatch(t.content, q)) {
      const project = store.projects[t.projectId];
      results.push({ id: t.id, type: 'taskcard', title: t.title || 'Taskcard', subtitle: project?.title, projectId: t.projectId });
    }
  });

  Object.values(store.timelines || {}).forEach((tl) => {
    if (fuzzyMatch(tl.title, q) || fuzzyMatch(tl.description || '', q)) {
      const project = store.projects[tl.projectId];
      results.push({ id: tl.id, type: 'timeline', title: tl.title, subtitle: project?.title, projectId: tl.projectId });
    }
  });

  Object.values(store.timelineEvents || {}).forEach((te) => {
    if (fuzzyMatch(te.title, q) || fuzzyMatch(te.description, q) || fuzzyMatch(te.date, q)) {
      const tl = store.timelines?.[te.timelineId];
      const project = store.projects[te.projectId];
      results.push({
        id: te.timelineId, // Navigate to parent timeline
        type: 'timelineEvent',
        title: `${te.title} (${te.date})`,
        subtitle: tl ? `${tl.title} • ${project?.title || ''}` : project?.title,
        projectId: te.projectId,
      });
    }
  });

  Object.values(store.documents || {}).forEach((d) => {
    if (fuzzyMatch(d.name, q)) {
      const project = store.projects[d.projectId];
      results.push({
        id: d.id,
        type: 'document',
        title: d.name,
        subtitle: `${d.pageCount ? `${d.pageCount} Seiten • ` : ''}${project?.title || ''}`,
        projectId: d.projectId,
      });
    }
  });

  Object.values(store.folders || {}).forEach((f) => {
    if (fuzzyMatch(f.name, q)) {
      const project = store.projects[f.projectId];
      results.push({
        id: f.id,
        type: 'folder',
        title: f.name,
        subtitle: `Ordner in ${project?.title || ''}`,
        projectId: f.projectId,
      });
    }
  });

  return results.slice(0, 20);
}

export const SearchModal: React.FC = () => {
  const { isOpen, close } = useSearchStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useSearchResults(query);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().toggle();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigateTo = useCallback((result: SearchResult) => {
    close();
    switch (result.type) {
      case 'project': navigate(`/projects/${result.id}`); break;
      case 'mindmap': navigate(`/projects/${result.projectId}/mindmaps/${result.id}`); break;
      case 'node': navigate(`/projects/${result.projectId}/mindmaps`); break;
      case 'note': navigate(`/projects/${result.projectId}/notes/${result.id}`); break;
      case 'flashcard': navigate(`/projects/${result.projectId}/flashcards`); break;
      case 'taskcard': navigate(`/projects/${result.projectId}/taskcards`); break;
      case 'timeline': navigate(`/projects/${result.projectId}/timelines/${result.id}`); break;
      case 'timelineEvent': navigate(`/projects/${result.projectId}/timelines/${result.id}`); break;
      case 'document':
        usePDFViewerStore.getState().openViewer(result.id, 1);
        break;
      case 'folder':
        navigate(`/projects/${result.projectId}/documents`);
        break;
    }
  }, [close, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      navigateTo(results[selected]);
    } else if (e.key === 'Escape') {
      close();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/15" onClick={close} />
      <div className="relative z-10 w-full max-w-lg bg-white border border-border rounded-lg shadow-modal animate-fade-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={16} className="text-text-disabled shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Suchen…"
            className="flex-1 bg-transparent text-ui text-text-primary placeholder:text-text-disabled outline-none"
          />
          <kbd className="text-xs text-text-disabled bg-bg-secondary border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        {query.trim() && (
          <div className="max-h-80 overflow-y-auto scrollbar-thin py-1">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-text-disabled">
                Keine Ergebnisse für „{query}"
              </div>
            ) : (
              results.map((r, i) => {
                const Icon = TYPE_ICONS[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => navigateTo(r)}
                    onMouseEnter={() => setSelected(i)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      i === selected ? 'bg-accent-light' : 'hover:bg-bg-secondary'
                    )}
                  >
                    <Icon size={14} className={cn('shrink-0', i === selected ? 'text-accent' : 'text-text-disabled')} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary truncate block">{r.title}</span>
                      {r.subtitle && (
                        <span className="text-xs text-text-disabled truncate block">{r.subtitle}</span>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs shrink-0',
                      i === selected ? 'text-accent' : 'text-text-disabled'
                    )}>
                      {TYPE_LABELS[r.type]}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {!query.trim() && (
          <div className="px-4 py-6 text-center text-sm text-text-disabled">
            Projekte, Mindmaps, Notizen, Karteikarten durchsuchen
          </div>
        )}
      </div>
    </div>
  );
};
