import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Printer,
  Download,
} from 'lucide-react';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';
import type { GlossarySourceType } from '../../types';

interface DisplayGlossaryItem {
  id: string;
  term: string;
  definition: string;
  sourceType: GlossarySourceType;
  sourceLabel: string;
  projectId: string;
  projectName?: string;
  linkUrl?: string;
  tags?: string[];
  isCustom?: boolean;
}

const ALPHABET = [
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
];

export const GlossaryPage: React.FC = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();

  const {
    projects,
    flashcards,
    knowledgeNodes,
    mindmapNodes,
    glossaryTerms = {},
    createGlossaryTerm,
    deleteGlossaryTerm,
  } = useStore();

  const project = projectId ? projects[projectId] : null;

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectedProjectIdForCreate, setSelectedProjectIdForCreate] = useState(
    projectId || Object.keys(projects)[0] || ''
  );

  // Aggregate terms across KnowledgeNodes, Flashcards, MindmapNodes & Custom Terms
  const aggregatedTerms = useMemo(() => {
    const list: DisplayGlossaryItem[] = [];
    const seenTerms = new Set<string>();

    const targetProjectIds = projectId
      ? [projectId]
      : Object.keys(projects);

    targetProjectIds.forEach((pId) => {
      const pName = projects[pId]?.title || 'Projekt';

      // 1. Custom Glossary terms
      Object.values(glossaryTerms).forEach((gt) => {
        if (gt.projectId === pId) {
          const key = `${pId}-${gt.term.toLowerCase().trim()}`;
          seenTerms.add(key);
          list.push({
            id: gt.id,
            term: gt.term,
            definition: gt.definition,
            sourceType: 'custom',
            sourceLabel: 'Eigenes Glossar',
            projectId: pId,
            projectName: pName,
            tags: gt.tags,
            isCustom: true,
          });
        }
      });

      // 2. Knowledge Nodes (Topics with descriptions)
      Object.values(knowledgeNodes).forEach((kn) => {
        if (kn.projectId === pId && kn.title && kn.description) {
          const key = `${pId}-${kn.title.toLowerCase().trim()}`;
          if (!seenTerms.has(key)) {
            seenTerms.add(key);
            list.push({
              id: `kn_${kn.id}`,
              term: kn.title,
              definition: kn.description,
              sourceType: 'knowledgeNode',
              sourceLabel: 'Thema',
              projectId: pId,
              projectName: pName,
              linkUrl: `/projects/${pId}`,
            });
          }
        }
      });

      // 3. Flashcards (Front = Term, Back = Definition)
      Object.values(flashcards).forEach((fc) => {
        if (fc.projectId === pId && fc.front && fc.back) {
          // Clean HTML tags if any
          const cleanFront = fc.front.replace(/<[^>]*>/g, '').trim();
          const cleanBack = fc.back.replace(/<[^>]*>/g, '').trim();

          // Only treat as glossary definition if front is reasonably short (<= 80 chars)
          if (cleanFront.length <= 80) {
            const key = `${pId}-${cleanFront.toLowerCase().trim()}`;
            if (!seenTerms.has(key)) {
              seenTerms.add(key);
              list.push({
                id: `fc_${fc.id}`,
                term: cleanFront,
                definition: cleanBack,
                sourceType: 'flashcard',
                sourceLabel: 'Karteikarte',
                projectId: pId,
                projectName: pName,
                linkUrl: `/projects/${pId}/flashcards`,
                tags: fc.tags,
              });
            }
          }
        }
      });

      // 4. Mindmap Nodes with content
      Object.values(mindmapNodes).forEach((mn) => {
        if (mn.projectId === pId && mn.title && mn.content) {
          const cleanContent = mn.content.replace(/<[^>]*>/g, '').trim();
          if (cleanContent.length > 0 && mn.title.length <= 80) {
            const key = `${pId}-${mn.title.toLowerCase().trim()}`;
            if (!seenTerms.has(key)) {
              seenTerms.add(key);
              list.push({
                id: `mn_${mn.id}`,
                term: mn.title,
                definition: cleanContent,
                sourceType: 'mindmapNode',
                sourceLabel: 'Mindmap',
                projectId: pId,
                projectName: pName,
                linkUrl: `/projects/${pId}/mindmaps/${mn.mindmapId}`,
              });
            }
          }
        }
      });
    });

    // Sort alphabetically (A-Z)
    return list.sort((a, b) => a.term.localeCompare(b.term, 'de', { sensitivity: 'base' }));
  }, [projects, projectId, glossaryTerms, knowledgeNodes, flashcards, mindmapNodes]);

  // Filtered terms based on search, selected letter, and source
  const filteredTerms = useMemo(() => {
    return aggregatedTerms.filter((item) => {
      // Source filter
      if (selectedSourceType !== 'all' && item.sourceType !== selectedSourceType) {
        return false;
      }

      // Alphabet letter filter
      if (selectedLetter) {
        const firstChar = item.term.charAt(0).toUpperCase();
        if (selectedLetter === '#') {
          if (/^[A-ZÄÖÜ]/.test(firstChar)) return false;
        } else {
          if (firstChar !== selectedLetter) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTerm = item.term.toLowerCase().includes(q);
        const matchesDef = item.definition.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTerm && !matchesDef && !matchesTags) return false;
      }

      return true;
    });
  }, [aggregatedTerms, selectedLetter, selectedSourceType, searchQuery]);

  const handleCreateTerm = () => {
    if (!newTerm.trim() || !newDefinition.trim()) return;
    const pId = projectId || selectedProjectIdForCreate;
    if (!pId) return;

    const tags = newTags
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    createGlossaryTerm(pId, newTerm.trim(), newDefinition.trim(), tags);

    setNewTerm('');
    setNewDefinition('');
    setNewTags('');
    setShowCreateModal(false);
  };

  const handleDeleteCustom = (id: string) => {
    if (window.confirm('Glossareintrag löschen?')) {
      deleteGlossaryTerm(id);
    }
  };

  // Export as Markdown Cheat Sheet
  const handleExportMarkdown = () => {
    let md = `# Glossar & Spickzettel${project ? `: ${project.title}` : ''}\n\n`;
    md += `Generiert am ${new Date().toLocaleDateString('de-DE')} • ${filteredTerms.length} Begriffe\n\n---\n\n`;

    filteredTerms.forEach((item) => {
      md += `### ${item.term}\n`;
      md += `**Definition:** ${item.definition}\n`;
      if (item.tags && item.tags.length > 0) {
        md += `*Tags: ${item.tags.join(', ')}*\n`;
      }
      md += `\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Glossar_${project?.title || 'Alle_Projekte'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-bg-canvas print:bg-white print:overflow-visible">
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-10">
        {/* Breadcrumb if project-scoped */}
        {project && (
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors cursor-pointer print:hidden"
          >
            <ArrowLeft size={14} /> {project.title}
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-medium text-text-primary tracking-tight">
                Automatisches Glossar
              </h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                A–Z Index
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {project
                ? `Alle Fachbegriffe und Definitionen aus „${project.title}“ an einem Ort`
                : 'Gesamtverzeichnis aller Fachbegriffe über alle deine Projekte hinweg'}
            </p>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              title="Drucken / PDF-Spickzettel erstellen"
            >
              <Printer size={13} /> Drucken
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportMarkdown}
              title="Als Markdown Spickzettel herunterladen"
            >
              <Download size={13} /> Export (.md)
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus size={13} /> Begriff hinzufügen
            </Button>
          </div>
        </div>

        {/* Search & Source Filter Bar */}
        <div className="mb-4 space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled"
              />
              <input
                type="text"
                placeholder="Begriff oder Definition durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-lg text-xs text-text-primary outline-none focus:border-accent shadow-2xs"
              />
            </div>

            <select
              value={selectedSourceType}
              onChange={(e) => setSelectedSourceType(e.target.value)}
              className="px-3 py-2 bg-white border border-border rounded-lg text-xs text-text-secondary outline-none focus:border-accent cursor-pointer shadow-2xs"
            >
              <option value="all">Alle Quellen</option>
              <option value="custom">Nur Eigenes Glossar</option>
              <option value="flashcard">Nur Karteikarten</option>
              <option value="knowledgeNode">Nur Themen</option>
              <option value="mindmapNode">Nur Mindmaps</option>
            </select>
          </div>

          {/* Alphabet Navigation Bar */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none flex-wrap">
            <button
              onClick={() => setSelectedLetter(null)}
              className={cn(
                'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer',
                selectedLetter === null
                  ? 'bg-[#0D0D0D] text-white font-medium'
                  : 'bg-white border border-border text-text-secondary hover:text-text-primary'
              )}
            >
              Alle ({aggregatedTerms.length})
            </button>
            {ALPHABET.map((letter) => {
              const count = aggregatedTerms.filter((it) => {
                const c = it.term.charAt(0).toUpperCase();
                return letter === '#' ? !/^[A-ZÄÖÜ]/.test(c) : c === letter;
              }).length;

              const hasItems = count > 0;

              return (
                <button
                  key={letter}
                  disabled={!hasItems}
                  onClick={() => setSelectedLetter(selectedLetter === letter ? null : letter)}
                  className={cn(
                    'w-7 h-7 rounded text-xs font-medium flex items-center justify-center transition-all cursor-pointer',
                    selectedLetter === letter
                      ? 'bg-[#0D0D0D] text-white shadow-xs'
                      : hasItems
                      ? 'bg-white border border-border text-text-primary hover:border-text-secondary hover:bg-bg-secondary'
                      : 'text-text-disabled/40 border border-transparent cursor-not-allowed'
                  )}
                  title={`${count} Begriffe mit ${letter}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Terms List */}
        {filteredTerms.length === 0 ? (
          <EmptyState
            title="Keine Glossarbegriffe gefunden"
            description="Füge einen Begriff manuell hinzu oder erstelle Karteikarten und Mindmaps, um das Glossar automatisch zu füllen."
            action={
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} /> Begriff anlegen
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredTerms.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-border rounded-lg p-4 hover:border-border-strong transition-all shadow-2xs group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-semibold text-text-primary tracking-tight">
                        {item.term}
                      </span>

                      {/* Source tag badge */}
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-medium border',
                          item.sourceType === 'custom' && 'bg-purple-50 text-purple-700 border-purple-200',
                          item.sourceType === 'flashcard' && 'bg-blue-50 text-blue-700 border-blue-200',
                          item.sourceType === 'knowledgeNode' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          item.sourceType === 'mindmapNode' && 'bg-amber-50 text-amber-700 border-amber-200'
                        )}
                      >
                        {item.sourceLabel}
                      </span>

                      {!projectId && (
                        <span className="text-[10px] text-text-disabled">
                          • {item.projectName}
                        </span>
                      )}

                      {item.tags?.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[9.5px] bg-bg-secondary text-text-secondary"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-wrap mt-1">
                      {item.definition}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 print:hidden">
                    {item.linkUrl && (
                      <button
                        onClick={() => navigate(item.linkUrl!)}
                        className="p-1.5 rounded text-text-disabled hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                        title="Zur Quelle navigieren"
                      >
                        <ExternalLink size={13} />
                      </button>
                    )}
                    {item.isCustom && (
                      <button
                        onClick={() => handleDeleteCustom(item.id)}
                        className="p-1.5 rounded text-text-disabled hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
                        title="Glossareintrag löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Term Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Neuen Glossarbegriff anlegen"
        size="md"
      >
        <div className="space-y-4">
          {!projectId && (
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1">
                Ziel-Projekt
              </label>
              <select
                value={selectedProjectIdForCreate}
                onChange={(e) => setSelectedProjectIdForCreate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border rounded text-xs text-text-primary outline-none focus:border-accent"
              >
                {Object.values(projects).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Begriff / Terminus
            </label>
            <Input
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              placeholder="z. B. Pareto-Prinzip, ATP, Mitose..."
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Definition / Erklärung
            </label>
            <textarea
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              placeholder="Genaue Definition oder Erklärung des Begriffs..."
              rows={4}
              className="w-full border border-border rounded px-3 py-2 text-xs text-text-primary placeholder:text-text-disabled outline-none focus:border-accent resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Tags (optional, kommagetrennt)
            </label>
            <Input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="z. B. Formel, Kernwissen, Prüfung"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Abbrechen
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTerm}
              disabled={!newTerm.trim() || !newDefinition.trim()}
            >
              Speichern
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
