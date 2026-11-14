import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { Network } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';
import type { Mindmap } from '../../types';

export const AllMindmapsPage: React.FC = () => {
  const navigate = useNavigate();
  const { mindmaps, projects } = useStore();
  const allMindmaps = Object.values(mindmaps) as Mindmap[];

  if (allMindmaps.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <h1 className="text-3xl font-medium text-text-primary tracking-tight mb-8">Mindmaps</h1>
          <EmptyState
            icon={<Network size={32} />}
            title="Noch keine Mindmaps"
            description="Erstelle ein Projekt und füge dort eine Mindmap hinzu."
            action={<button onClick={() => navigate('/projects')} className="text-sm text-accent hover:underline">Zu den Projekten</button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-medium text-text-primary tracking-tight mb-8">Mindmaps</h1>
        <div className="border border-border rounded-md overflow-hidden">
          {allMindmaps.map((m, i) => {
            const project = projects[m.projectId];
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/projects/${m.projectId}/mindmaps/${m.id}`)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left ${i < allMindmaps.length - 1 ? 'border-b border-border' : ''}`}
              >
                <Network size={15} className="text-text-disabled shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ui font-medium text-text-primary truncate">{m.title}</p>
                  {project && <p className="text-xs text-text-disabled">{project.title}</p>}
                </div>
                <span className="text-xs text-text-disabled shrink-0">{formatDate(m.updatedAt)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
