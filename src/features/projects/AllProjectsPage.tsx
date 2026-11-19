import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Network,
  CreditCard,
  StickyNote,
  Milestone,
  Layers,
} from 'lucide-react';
import { useStore, useProjects } from '../../store';
import { formatDate } from '../../utils';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input, Textarea } from '../../components/Input';
import { cn } from '../../utils/cn';

export const AllProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjects();
  const { createProject, deleteProject, updateProject, mindmaps, flashcards, notes, timelines, taskcards } = useStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const [editProject, setEditProject] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const project = createProject(newTitle.trim(), newDesc.trim());
    setShowCreate(false);
    setNewTitle('');
    setNewDesc('');
    navigate(`/projects/${project.id}`);
  };

  const handleEdit = () => {
    if (!editProject || !editTitle.trim()) return;
    updateProject(editProject, { title: editTitle.trim(), description: editDesc.trim() });
    setEditProject(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Projekt wirklich löschen? Alle zugehörigen Inhalte werden entfernt.')) {
      deleteProject(id);
      setMenuOpen(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">Projekte</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">Alle Lernprojekte und zugehörige Materialien</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={12} strokeWidth={2.5} /> Neues Projekt
          </Button>
        </div>

        {/* Projects list */}
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} strokeWidth={1.5} />}
            title="Noch keine Projekte"
            description="Erstelle dein erstes Lernprojekt, um Notizen, Mindmaps und Karteikarten zu organisieren."
            action={
              <Button variant="primary" onClick={() => setShowCreate(true)}>
                <Plus size={12} />
                Projekt erstellen
              </Button>
            }
          />
        ) : (
          <div className="border border-border rounded overflow-hidden">
            {projects.map((project, i) => {
              const mindmapCount = Object.values(mindmaps).filter(m => m.projectId === project.id).length;
              const timelineCount = Object.values(timelines || {}).filter(t => t.projectId === project.id).length;
              const flashcardCount = Object.values(flashcards).filter(f => f.projectId === project.id).length;
              const noteCount = Object.values(notes).filter(n => n.projectId === project.id).length;
              const taskcardCount = Object.values(taskcards || {}).filter(tc => tc.projectId === project.id).length;

              return (
                <div
                  key={project.id}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3.5 cursor-pointer hover:bg-bg-secondary transition-colors',
                    i < projects.length - 1 && 'border-b border-border'
                  )}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <FolderOpen size={16} className="text-text-disabled shrink-0 group-hover:text-text-secondary transition-colors" />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-medium text-text-primary truncate">{project.title}</p>
                    {project.description && (
                      <p className="text-[12px] text-text-disabled truncate mt-0.5">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-text-disabled">
                        {formatDate(project.updatedAt)}
                      </span>
                      <div className="flex items-center gap-2.5 text-[11px] text-text-disabled">
                        {mindmapCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Network size={10} strokeWidth={1.8} /> {mindmapCount}
                          </span>
                        )}
                        {timelineCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Milestone size={10} strokeWidth={1.8} /> {timelineCount}
                          </span>
                        )}
                        {flashcardCount > 0 && (
                          <span className="flex items-center gap-1">
                            <CreditCard size={10} strokeWidth={1.8} /> {flashcardCount}
                          </span>
                        )}
                        {noteCount > 0 && (
                          <span className="flex items-center gap-1">
                            <StickyNote size={10} strokeWidth={1.8} /> {noteCount}
                          </span>
                        )}
                        {taskcardCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Layers size={10} strokeWidth={1.8} /> {taskcardCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="relative opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                      className="p-2 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Optionen"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-8 z-20 bg-white border border-border rounded shadow-dropdown min-w-[130px] py-1 animate-fade-in">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-text-primary hover:bg-bg-secondary"
                          onClick={() => {
                            setEditProject(project.id);
                            setEditTitle(project.title);
                            setEditDesc(project.description);
                            setMenuOpen(null);
                          }}
                        >
                          <Edit2 size={12} /> Umbenennen
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-danger hover:bg-danger-light"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 size={12} /> Löschen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); setNewTitle(''); setNewDesc(''); }}
        title="Neues Projekt"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            placeholder="z.B. Biologie – Zellteilung"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <Textarea
            label="Beschreibung (optional)"
            placeholder="Kurze Beschreibung…"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <Button variant="secondary" onClick={() => { setShowCreate(false); setNewTitle(''); setNewDesc(''); }}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim()}>
              Erstellen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editProject}
        onClose={() => setEditProject(null)}
        title="Projekt bearbeiten"
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <Textarea
            label="Beschreibung (optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-1.5 pt-1">
            <Button variant="secondary" onClick={() => setEditProject(null)}>Abbrechen</Button>
            <Button variant="primary" onClick={handleEdit} disabled={!editTitle.trim()}>Speichern</Button>
          </div>
        </div>
      </Modal>

      {/* Click outside menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  );
};
