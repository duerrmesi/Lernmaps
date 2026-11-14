import React, { useState } from 'react';
import { useStore } from '../../store';
import { AlertTriangle, BookOpen, Lightbulb, Zap, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { MistakeCategory } from '../../types';

const CATEGORIES: MistakeCategory[] = ['Fachwissen', 'Verständnis', 'Anwendung', 'Flüchtigkeit'];

const categoryIcon = (cat: MistakeCategory) => {
  switch (cat) {
    case 'Fachwissen': return <BookOpen size={12} className="text-red-400" />;
    case 'Verständnis': return <Lightbulb size={12} className="text-yellow-400" />;
    case 'Anwendung': return <Zap size={12} className="text-orange-400" />;
    case 'Flüchtigkeit': return <AlertTriangle size={12} className="text-blue-400" />;
  }
};

export const MistakesPage: React.FC = () => {
  const { mistakes, knowledgeNodes, projects } = useStore();
  const [filterCategory, setFilterCategory] = useState<MistakeCategory | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  const mistakeList = Object.values(mistakes).sort(
    (a, b) => b.timestamp.localeCompare(a.timestamp)
  );

  const filtered = mistakeList.filter(m => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterProject !== 'all' && m.projectId !== filterProject) return false;
    return true;
  });

  const projectList = Object.values(projects);

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = mistakeList.filter(m => m.category === cat).length;
    return acc;
  }, {} as Record<MistakeCategory, number>);

  return (
    <div className="flex-1 overflow-y-auto bg-bg-canvas">
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[20px] font-semibold text-text-primary mb-1">Fehlerprotokoll</h1>
          <p className="text-[13px] text-text-secondary">
            {mistakeList.length} gespeicherte Fehler
          </p>
        </div>

        {/* Category summary */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
              className={cn(
                "border rounded-lg px-3 py-2.5 text-left transition-colors",
                filterCategory === cat
                  ? "border-text-primary bg-bg-secondary"
                  : "border-border hover:border-border-strong hover:bg-bg-secondary"
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {categoryIcon(cat)}
                <span className="text-[11px] font-medium text-text-primary">{cat}</span>
              </div>
              <span className="text-[18px] font-semibold text-text-primary">{categoryCounts[cat]}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="text-[12px] bg-bg-secondary border border-border rounded px-2 py-1.5 text-text-primary"
          >
            <option value="all">Alle Projekte</option>
            {projectList.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {filterCategory !== 'all' && (
            <button
              onClick={() => setFilterCategory('all')}
              className="flex items-center gap-1 text-[11px] text-text-secondary hover:text-text-primary border border-border rounded px-2 py-1.5"
            >
              <X size={10} />
              Filter: {filterCategory}
            </button>
          )}
          <span className="text-[11px] text-text-disabled ml-auto">{filtered.length} Einträge</span>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle size={28} className="text-text-disabled mx-auto mb-3" />
            <p className="text-[13px] text-text-secondary">Keine Fehler gefunden</p>
            <p className="text-[12px] text-text-disabled mt-1">Fehler werden beim Lernen automatisch protokolliert</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(mistake => {
              const node = knowledgeNodes[mistake.knowledgeNodeId];
              const project = projects[mistake.projectId];
              const date = new Date(mistake.timestamp);
              return (
                <div
                  key={mistake.id}
                  className="border border-border rounded-lg px-4 py-3 bg-bg-canvas hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {categoryIcon(mistake.category)}
                        <span className="text-[11px] font-medium text-text-disabled uppercase tracking-wide">
                          {mistake.category}
                        </span>
                        {node && (
                          <>
                            <span className="text-text-disabled">·</span>
                            <span className="text-[12px] text-text-secondary font-medium">{node.title}</span>
                          </>
                        )}
                      </div>
                      <p className="text-[13px] text-text-primary leading-snug">{mistake.description}</p>
                      {project && (
                        <span className="text-[11px] text-text-disabled mt-1 block">{project.title}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-disabled whitespace-nowrap shrink-0">
                      {date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
