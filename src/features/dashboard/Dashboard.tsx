import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Trash2, Edit2, FolderOpen, Network, CreditCard, StickyNote, Milestone } from 'lucide-react';
import { useStore, useProjects } from '../../store';
import { formatDate } from '../../utils';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input, Textarea } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { cn } from '../../utils/cn';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const projects = useProjects();
  const { createProject, deleteProject, updateProject, mindmaps, flashcards, notes, timelines } = useStore();

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

  const knowledgeNodes = Object.values(useStore(s => s.knowledgeNodes));
  
  // Basic calculations for dashboard
  const nowTime = new Date().getTime();
  const dueReviews = knowledgeNodes.filter(n => n.nextReview && new Date(n.nextReview).getTime() <= nowTime).length;
  const weakNodes = knowledgeNodes.filter(n => n.overallStatus === 'WEAK' || n.overallStatus === 'NOT_LEARNED').length;
  const numQuestions = Object.values(useStore(s => s.questions)).length;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-8 py-8">
        
        {/* Learning Status Overview */}
        <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2 bg-white border border-border rounded p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-[14px] font-medium text-text-primary mb-1">Heute lernen</h2>
              <div className="text-[12px] text-text-disabled flex gap-4 mt-3">
                <div className="flex flex-col">
                  <span className="text-xl font-semibold text-text-primary">{dueReviews}</span>
                  <span>Wiederholungen</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-semibold text-text-primary">{weakNodes}</span>
                  <span>Schwachstellen</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-semibold text-text-primary">{numQuestions}</span>
                  <span>Aufgaben</span>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/study')}>
                Jetzt lernen
              </Button>
            </div>
          </div>
          
          <div className="col-span-1 bg-white border border-border rounded p-5">
            <h2 className="text-[14px] font-medium text-text-primary mb-3">Meine Schwächen</h2>
            <div className="flex flex-col gap-2">
              {knowledgeNodes
                .filter(n => n.overallStatus === 'WEAK' || n.overallStatus === 'NOT_LEARNED')
                .slice(0, 3)
                .map(n => (
                  <div key={n.id} className="text-[12px]">
                    <div className="font-medium text-text-primary truncate">{n.title}</div>
                    <div className="text-text-disabled">Wissensstand: {n.overallStatus}</div>
                  </div>
                ))}
              {weakNodes === 0 && (
                <div className="text-[12px] text-text-disabled">Keine Schwachstellen erkannt.</div>
              )}
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold text-text-primary tracking-tight">Projekte</h1>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={11} strokeWidth={2.5} /> Neues Projekt
          </Button>
        </div>

        {/* Projects list */}
        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={28} strokeWidth={1.5} />}
            title="Noch keine Projekte"
            description="Erstelle dein erstes Lernprojekt, um loszulegen."
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

              return (
                <div
                  key={project.id}
                  className={cn(
                    'group flex items-center gap-4 px-3.5 py-2.5 cursor-pointer hover:bg-bg-secondary transition-colors',
                    i < projects.length - 1 && 'border-b border-border'
                  )}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{project.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-text-disabled">
                        {formatDate(project.updatedAt)}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-text-disabled">
                        {mindmapCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Network size={10} strokeWidth={1.8} /> {mindmapCount}
                          </span>
                        )}
                        {timelineCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Milestone size={10} strokeWidth={1.8} /> {timelineCount}
                          </span>
                        )}
                        {flashcardCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <CreditCard size={10} strokeWidth={1.8} /> {flashcardCount}
                          </span>
                        )}
                        {noteCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <StickyNote size={10} strokeWidth={1.8} /> {noteCount}
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
                      className="p-1.5 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-7 z-20 bg-white border border-border rounded shadow-dropdown min-w-[130px] py-0.5 animate-fade-in">
                        <button
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-text-primary hover:bg-bg-secondary"
                          onClick={() => {
                            setEditProject(project.id);
                            setEditTitle(project.title);
                            setEditDesc(project.description);
                            setMenuOpen(null);
                          }}
                        >
                          <Edit2 size={11} /> Umbenennen
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[12px] text-danger hover:bg-danger-light"
                          onClick={() => handleDelete(project.id)}
                        >
                          <Trash2 size={11} /> Löschen
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
