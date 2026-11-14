import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Network, CreditCard, StickyNote, Layers, Milestone, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { useStore } from '../../store';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { formatDate } from '../../utils';

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, mindmaps, notes, flashcards, taskcards, timelines, createMindmap, createTimeline, deleteProject, updateProject } = useStore();

  const project = projectId ? projects[projectId] : null;
  const projectMindmaps = Object.values(mindmaps).filter(m => m.projectId === projectId);
  const projectTimelines = Object.values(timelines || {}).filter(t => t.projectId === projectId);
  const projectNotes = Object.values(notes).filter(n => n.projectId === projectId);
  const projectFlashcards = Object.values(flashcards).filter(f => f.projectId === projectId);
  const projectTaskcards = Object.values(taskcards).filter(t => t.projectId === projectId);

  const [showNewMindmap, setShowNewMindmap] = useState(false);
  const [newMindmapTitle, setNewMindmapTitle] = useState('');
  const [showNewTimeline, setShowNewTimeline] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-text-secondary text-sm">Projekt nicht gefunden.</p>
      </div>
    );
  }

  const handleCreateMindmap = () => {
    if (!newMindmapTitle.trim() || !projectId) return;
    const mindmap = createMindmap(projectId, newMindmapTitle.trim());
    setShowNewMindmap(false);
    setNewMindmapTitle('');
    navigate(`/projects/${projectId}/mindmaps/${mindmap.id}`);
  };

  const handleCreateTimeline = () => {
    if (!newTimelineTitle.trim() || !projectId) return;
    const timeline = createTimeline(projectId, newTimelineTitle.trim());
    setShowNewTimeline(false);
    setNewTimelineTitle('');
    navigate(`/projects/${projectId}/timelines/${timeline.id}`);
  };

  const handleDelete = () => {
    if (window.confirm('Projekt wirklich löschen?')) {
      deleteProject(project.id);
      navigate('/projects');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate('/projects')}
          className="text-[11px] text-text-disabled hover:text-text-secondary transition-colors mb-5 block"
        >
          ← Projekte
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-xl font-semibold text-text-primary tracking-tight">{project.title}</h1>
            {project.description && (
              <p className="text-[12.5px] text-text-secondary mt-0.5">{project.description}</p>
            )}
            <p className="text-[11px] text-text-disabled mt-1">Erstellt {formatDate(project.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => { setEditTitle(project.title); setShowEdit(true); }}>
              <Edit2 size={11} /> Bearbeiten
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={11} />
            </Button>
          </div>
        </div>

        {/* Mindmaps */}
        <Section
          icon={<Network size={13} strokeWidth={1.8} />}
          title="Mindmaps"
          count={projectMindmaps.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowNewMindmap(true)}>
              <Plus size={11} strokeWidth={2.5} /> Neue Mindmap
            </Button>
          }
        >
          {projectMindmaps.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-2">Noch keine Mindmaps</p>
          ) : (
            projectMindmaps.map(m => (
              <SectionRow
                key={m.id}
                title={m.title}
                meta={`${formatDate(m.updatedAt)}`}
                onClick={() => navigate(`/projects/${projectId}/mindmaps/${m.id}`)}
              />
            ))
          )}
        </Section>

        {/* Zeitstrahlen */}
        <Section
          icon={<Milestone size={13} strokeWidth={1.8} />}
          title="Zeitstrahlen"
          count={projectTimelines.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowNewTimeline(true)}>
              <Plus size={11} strokeWidth={2.5} /> Neuer Zeitstrahl
            </Button>
          }
        >
          {projectTimelines.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-2">Noch keine Zeitstrahlen</p>
          ) : (
            projectTimelines.map(t => (
              <SectionRow
                key={t.id}
                title={t.title}
                meta={`${formatDate(t.updatedAt)}`}
                onClick={() => navigate(`/projects/${projectId}/timelines/${t.id}`)}
              />
            ))
          )}
        </Section>

        {/* Notes */}
        <Section
          icon={<StickyNote size={13} strokeWidth={1.8} />}
          title="Notizen"
          count={projectNotes.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}/notes`)}>
              Öffnen
            </Button>
          }
        >
          {projectNotes.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-2">Noch keine Notizen</p>
          ) : (
            projectNotes.slice(0, 4).map(n => (
              <SectionRow
                key={n.id}
                title={n.title}
                meta={formatDate(n.updatedAt)}
                onClick={() => navigate(`/projects/${projectId}/notes/${n.id}`)}
              />
            ))
          )}
          {projectNotes.length > 4 && (
            <button
              onClick={() => navigate(`/projects/${projectId}/notes`)}
              className="text-[11.5px] text-accent hover:underline mt-1 block"
            >
              Alle {projectNotes.length} Notizen anzeigen
            </button>
          )}
        </Section>

        {/* Flashcards */}
        <Section
          icon={<CreditCard size={13} strokeWidth={1.8} />}
          title="Karteikarten"
          count={projectFlashcards.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}/flashcards`)}>
              Verwalten
            </Button>
          }
        >
          <div className="flex items-center justify-between py-1">
            <p className="text-[12.5px] text-text-secondary">
              {projectFlashcards.length === 0 ? 'Noch keine Karteikarten' : `${projectFlashcards.length} Karten`}
            </p>
            {projectFlashcards.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/flashcards/learn`)}
              >
                Lernen starten
              </Button>
            )}
          </div>
        </Section>

        {/* Taskcards */}
        <Section
          icon={<Layers size={13} strokeWidth={1.8} />}
          title="Taskcards"
          count={projectTaskcards.length}
          action={
            <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}/taskcards`)}>
              Whiteboard
            </Button>
          }
        >
          <p className="text-[12.5px] text-text-secondary py-1">
            {projectTaskcards.length === 0 ? 'Noch keine Taskcards' : `${projectTaskcards.length} Karten`}
          </p>
        </Section>
      </div>

      {/* New mindmap modal */}
      <Modal isOpen={showNewMindmap} onClose={() => setShowNewMindmap(false)} title="Neue Mindmap" size="sm">
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            placeholder="z.B. Mitose"
            value={newMindmapTitle}
            onChange={(e) => setNewMindmapTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateMindmap()}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button variant="secondary" onClick={() => setShowNewMindmap(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={handleCreateMindmap} disabled={!newMindmapTitle.trim()}>Erstellen</Button>
          </div>
        </div>
      </Modal>

      {/* New timeline modal */}
      <Modal isOpen={showNewTimeline} onClose={() => setShowNewTimeline(false)} title="Neuer Zeitstrahl" size="sm">
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            placeholder="z.B. Weimarer Republik"
            value={newTimelineTitle}
            onChange={(e) => setNewTimelineTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTimeline()}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button variant="secondary" onClick={() => setShowNewTimeline(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={handleCreateTimeline} disabled={!newTimelineTitle.trim()}>Erstellen</Button>
          </div>
        </div>
      </Modal>

      {/* Edit project modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Projekt bearbeiten" size="sm">
        <div className="flex flex-col gap-3">
          <Input
            label="Titel"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateProject(project.id, { title: editTitle.trim() });
                setShowEdit(false);
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={() => { updateProject(project.id, { title: editTitle.trim() }); setShowEdit(false); }} disabled={!editTitle.trim()}>Speichern</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Section sub-component ─────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, count, action, children }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5 text-text-secondary">
        {icon}
        <span className="text-[12px] font-semibold text-text-primary">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-text-disabled bg-bg-secondary px-1 py-px rounded-sm">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
    <div className="border-t border-border pt-1">
      {children}
    </div>
  </div>
);

interface SectionRowProps {
  title: string;
  meta?: string;
  onClick: () => void;
}

const SectionRow: React.FC<SectionRowProps> = ({ title, meta, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-1.5 text-left group transition-colors border-b border-border last:border-0"
  >
    <div>
      <span className="text-[12.5px] text-text-primary group-hover:text-accent transition-colors">{title}</span>
      {meta && <span className="block text-[11px] text-text-disabled">{meta}</span>}
    </div>
    <ChevronRight size={12} className="text-text-disabled group-hover:text-accent transition-colors" />
  </button>
);
