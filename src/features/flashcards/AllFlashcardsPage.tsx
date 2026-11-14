import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { formatDate } from '../../utils';
import { CreditCard } from 'lucide-react';
import { EmptyState } from '../../components/EmptyState';

export const AllFlashcardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { flashcards, projects } = useStore();
  const allFlashcards = Object.values(flashcards).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-medium text-text-primary tracking-tight mb-8">Alle Karteikarten</h1>

        {allFlashcards.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={32} />}
            title="Noch keine Karteikarten"
            description="Erstelle Karteikarten innerhalb eines Projekts."
            action={<button onClick={() => navigate('/projects')} className="text-sm text-accent hover:underline">Zu den Projekten</button>}
          />
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            {allFlashcards.map((f, i) => {
              const project = projects[f.projectId];
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(`/projects/${f.projectId}/flashcards`)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-bg-secondary transition-colors text-left ${i < allFlashcards.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <CreditCard size={15} className="text-text-disabled shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui font-medium text-text-primary truncate">{f.front}</p>
                    {project && <p className="text-xs text-text-disabled truncate">{project.title}</p>}
                  </div>
                  <span className="text-xs text-text-disabled shrink-0">{formatDate(f.updatedAt)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
