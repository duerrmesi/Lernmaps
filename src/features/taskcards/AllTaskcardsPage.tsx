import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { Layers } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';

export const AllTaskcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { taskcards, projects } = useStore();
  const allTaskcards = Object.values(taskcards).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-medium text-text-primary tracking-tight mb-8">Alle Taskcards</h1>

        {allTaskcards.length === 0 ? (
          <EmptyState
            icon={<Layers size={32} />}
            title="Noch keine Taskcards"
            description="Erstelle Taskcards auf dem Whiteboard eines Projekts."
            action={<button onClick={() => navigate('/projects')} className="text-sm text-accent hover:underline">Zu den Projekten</button>}
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            {allTaskcards.map((t, i) => {
              const project = projects[t.projectId];
              return (
                <button
                  key={t.id}
                  onClick={() => navigate(`/projects/${t.projectId}/taskcards`)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left ${i < allTaskcards.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <Layers size={15} className="text-text-disabled shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-medium text-text-primary truncate">{t.title || 'Ohne Titel'}</p>
                    {project && <p className="text-xs text-text-disabled truncate">{project.title}</p>}
                  </div>
                  <span className="text-xs text-text-disabled shrink-0">{formatDate(t.updatedAt)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
