import React, { useState } from 'react';
import { useStore } from '../../store';
import { DocumentsPage } from './DocumentsPage';
import { FolderOpen } from 'lucide-react';
import { Button } from '../../components/Button';

export const AllDocumentsPage: React.FC = () => {
  const { projects, createProject } = useStore();
  const projectList = Object.values(projects).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectList[0]?.id || ''
  );

  if (projectList.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <FolderOpen size={40} className="text-text-disabled mb-3" />
        <h2 className="text-base font-semibold text-text-primary mb-1">
          Noch kein Projekt vorhanden
        </h2>
        <p className="text-xs text-text-secondary max-w-sm mb-4">
          Erstelle zuerst ein Projekt, um darin Ordner und PDF-Dokumente zu organisieren.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const name = prompt('Projektname:');
            if (name?.trim()) {
              const p = createProject(name.trim());
              setSelectedProjectId(p.id);
            }
          }}
        >
          Neues Projekt erstellen
        </Button>
      </div>
    );
  }

  const activeProject =
    projectList.find((p) => p.id === selectedProjectId) || projectList[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-canvas overflow-hidden">
      {/* Top Project Selector Bar */}
      <div className="border-b border-border bg-bg-primary px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-primary" size={20} />
          <span className="text-sm font-bold text-text-primary">
            Dokumente & Ordner:
          </span>
          <select
            value={activeProject.id}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-bg-secondary text-text-primary text-xs font-medium focus:outline-hidden focus:border-primary"
          >
            {projectList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Embedded Documents Page for selected project */}
      <DocumentsPage
        key={activeProject.id}
        projectIdOverride={activeProject.id}
        hideProjectHeader={true}
      />
    </div>
  );
};
