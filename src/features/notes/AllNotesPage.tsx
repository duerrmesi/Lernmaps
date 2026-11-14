import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { StickyNote } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';

export const AllNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { notes, projects } = useStore();
  const allNotes = Object.values(notes).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-medium text-text-primary tracking-tight mb-8">Alle Notizen</h1>

        {allNotes.length === 0 ? (
          <EmptyState
            icon={<StickyNote size={32} />}
            title="Noch keine Notizen"
            description="Erstelle Notizen innerhalb eines Projekts."
            action={<button onClick={() => navigate('/projects')} className="text-sm text-accent hover:underline">Zu den Projekten</button>}
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            {allNotes.map((n, i) => {
              const project = projects[n.projectId];
              return (
                <button
                  key={n.id}
                  onClick={() => navigate(`/projects/${n.projectId}/notes/${n.id}`)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left ${i < allNotes.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <StickyNote size={15} className="text-text-disabled shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-medium text-text-primary truncate">{n.title}</p>
                    {project && <p className="text-xs text-text-disabled truncate">{project.title}</p>}
                  </div>
                  <span className="text-xs text-text-disabled shrink-0">{formatDate(n.updatedAt)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
