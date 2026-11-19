import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Link, Trash2, FileText, Loader2, Link2, Check, Edit2 } from 'lucide-react';
import { useStore } from '../../store';
import type { MindmapNode, NodeAttachment, NodeFontSize, NodeImageSize } from '../../types';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { cn } from '../../utils/cn';
import {
  fileToAttachment,
  formatFileSize,
  openFileAttachment,
} from '../../utils/attachmentStorage';

interface NodeDetailPanelProps {
  node: MindmapNode;
  projectId: string;
  onClose: () => void;
  onAddChild: (parentId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onDeleteNode?: (id: string) => void;
  onExpandImage?: (att: NodeAttachment) => void;
  onStartConnecting?: (nodeId: string) => void;
}

export const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({
  node,
  projectId,
  onClose,
  onAddChild,
  onDeleteNode,
  onExpandImage,
  onStartConnecting,
}) => {
  const navigate = useNavigate();
  const {
    updateNode,
    notes,
    flashcards,
    taskcards,
    linkNoteToNode,
    unlinkNoteFromNode,
    linkFlashcardToNode,
    unlinkFlashcardFromNode,
    linkTaskcardToNode,
    unlinkTaskcardFromNode,
    createFlashcard,
  } = useStore();

  const [content, setContent] = useState(node.content);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showLinkNote, setShowLinkNote] = useState(false);
  const [showLinkFlashcard, setShowLinkFlashcard] = useState(false);
  const [showLinkTaskcard, setShowLinkTaskcard] = useState(false);
  const [showNewFlashcard, setShowNewFlashcard] = useState(false);
  const [fcFront, setFcFront] = useState('');
  const [fcBack, setFcBack] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContent(node.content);
  }, [node.id, node.content]);

  useEffect(() => {
    setTitleValue(node.title);
  }, [node.id, node.title]);

  useEffect(() => {
    if (isEditingTitle) {
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isEditingTitle]);

  const handleTitleCommit = () => {
    const val = titleValue.trim();
    if (val && val !== node.title) {
      updateNode(node.id, { title: val });
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== node.content) {
        updateNode(node.id, { content });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [content, node.id, node.content, updateNode]);

  const projectNotes = Object.values(notes).filter((n) => n.projectId === projectId);
  const projectFlashcards = Object.values(flashcards).filter((f) => f.projectId === projectId);
  const projectTaskcards = Object.values(taskcards).filter((t) => t.projectId === projectId);

  const linkedNotes = node.linkedNoteIds.map((id) => notes[id]).filter(Boolean);
  const linkedFlashcards = node.linkedFlashcardIds.map((id) => flashcards[id]).filter(Boolean);
  const linkedTaskcards = node.linkedTaskcardIds.map((id) => taskcards[id]).filter(Boolean);

  const attachments = node.attachments || [];

  const handleCreateFlashcard = () => {
    if (!fcFront.trim()) return;
    const card = createFlashcard(projectId, fcFront.trim(), fcBack.trim());
    linkFlashcardToNode(card.id, node.id);
    setFcFront('');
    setFcBack('');
    setShowNewFlashcard(false);
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      const newAtts: NodeAttachment[] = [];
      for (const f of files) {
        const att = await fileToAttachment(f);
        newAtts.push(att);
      }
      updateNode(node.id, {
        attachments: [...(node.attachments || []), ...newAtts],
      });
    } catch (err) {
      console.error('Error adding attachments', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = (attId: string) => {
    updateNode(node.id, {
      attachments: (node.attachments || []).filter((a) => a.id !== attId),
    });
  };

  return (
    <div className="w-full sm:w-[310px] max-w-full h-full border-l border-border bg-white flex flex-col overflow-hidden animate-slide-in-right z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border shrink-0 bg-white">
        <div className="flex-1 min-w-0 mr-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleCommit();
                  if (e.key === 'Escape') {
                    setTitleValue(node.title);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={handleTitleCommit}
                className="w-full text-[12.5px] font-semibold text-text-primary bg-bg-secondary px-2 py-1 rounded border border-accent outline-none"
              />
              <button onClick={handleTitleCommit} className="text-accent p-1 shrink-0 cursor-pointer" title="Bestätigen">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-1.5 cursor-pointer group/title"
              title="Klicken zum Umbenennen"
            >
              <h3 className="text-[12.5px] font-semibold text-text-primary truncate">{node.title}</h3>
              <Edit2 size={11} className="text-text-disabled group-hover/title:text-text-primary shrink-0 transition-colors" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onStartConnecting && (
            <button
              onClick={() => onStartConnecting(node.id)}
              className="text-text-disabled hover:text-text-primary transition-colors p-1.5 rounded hover:bg-bg-secondary cursor-pointer"
              title="Mit anderem Knoten verbinden (A → B)"
            >
              <Link2 size={14} />
            </button>
          )}
          {onDeleteNode && (
            <button
              onClick={() => onDeleteNode(node.id)}
              className="text-text-disabled hover:text-danger transition-colors p-1.5 rounded hover:bg-danger/10 cursor-pointer"
              title="Knoten löschen"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-text-disabled hover:text-text-primary transition-colors p-1.5 rounded hover:bg-bg-secondary cursor-pointer"
            title="Schließen"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Notes / Content */}
        <Section title="Notizen">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notizen zu diesem Knoten…"
            className={cn(
              'w-full resize-none text-[12.5px] text-text-primary placeholder:text-text-disabled',
              'bg-transparent outline-none leading-relaxed min-h-[72px]'
            )}
            rows={3}
          />
        </Section>

        {/* Styling: Font Size & Image Size */}
        <Section title="Gestaltung">
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10.5px] font-medium text-text-secondary block mb-1">
                Schriftgröße
              </label>
              <div className="flex rounded border border-border bg-bg-secondary p-0.5">
                {(['sm', 'md', 'lg', 'xl'] as NodeFontSize[]).map((size) => {
                  const currentSize = node.fontSize || (node.parentId === null ? 'lg' : 'md');
                  const isActive = currentSize === size;
                  const label = size === 'sm' ? 'S' : size === 'md' ? 'M' : size === 'lg' ? 'L' : 'XL';
                  return (
                    <button
                      key={size}
                      onClick={() => updateNode(node.id, { fontSize: size })}
                      className={cn(
                        'flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center cursor-pointer',
                        isActive
                          ? 'bg-[#0D0D0D] text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-medium text-text-secondary block mb-1">
                Bildgröße
              </label>
              <div className="flex rounded border border-border bg-bg-secondary p-0.5">
                {(['sm', 'md', 'lg', 'xl'] as NodeImageSize[]).map((size) => {
                  const currentImgSize = node.imageSize || 'md';
                  const isActive = currentImgSize === size;
                  const label = size === 'sm' ? 'S' : size === 'md' ? 'M' : size === 'lg' ? 'L' : 'XL';
                  const tooltip =
                    size === 'sm'
                      ? 'Klein'
                      : size === 'md'
                      ? 'Mittel'
                      : size === 'lg'
                      ? 'Groß'
                      : 'Sehr groß';
                  return (
                    <button
                      key={size}
                      onClick={() => updateNode(node.id, { imageSize: size })}
                      title={tooltip}
                      className={cn(
                        'flex-1 py-1 text-[11px] font-medium rounded transition-colors text-center cursor-pointer',
                        isActive
                          ? 'bg-[#0D0D0D] text-white shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* Attachments (Bilder & Dateien) */}
        <Section
          title="Dateien & Bilder"
          count={attachments.length}
          action={
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[11px] text-accent hover:underline flex items-center gap-0.5 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Plus size={10} strokeWidth={2.5} />
              )}
              Hinzufügen
            </button>
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) {
                handleUploadFiles(e.target.files);
                e.target.value = '';
              }
            }}
          />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer?.files) {
                handleUploadFiles(e.dataTransfer.files);
              }
            }}
          >
            {attachments.length === 0 ? (
              <p className="text-[11.5px] text-text-disabled leading-relaxed">
                Keine Anhänge. Datei hineinziehen oder Bild mit <kbd className="px-1 py-0.5 rounded bg-bg-secondary border border-border text-[9.5px] font-mono">Strg + V</kbd> einfügen.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-1.5 rounded bg-bg-secondary text-[11.5px] border border-border/50 group"
                  >
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    onClick={() => {
                      if (att.type === 'image') onExpandImage?.(att);
                    }}
                    onDoubleClick={() => {
                      if (att.type === 'file') openFileAttachment(att);
                    }}
                    title={
                      att.type === 'image'
                        ? 'Klicken zum Vergrößern'
                        : `${att.name} (Doppelklick zum Öffnen)`
                    }
                  >
                    {att.type === 'image' && att.dataUrl ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-7 h-7 object-cover rounded shrink-0 border border-border"
                      />
                    ) : (
                      <FileText size={15} className="shrink-0 text-text-secondary" />
                    )}
                    <span className="truncate text-text-primary font-medium">{att.name}</span>
                    <span className="text-[9.5px] text-text-disabled shrink-0">
                      ({formatFileSize(att.size)})
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-text-disabled hover:text-danger p-1 transition-opacity ml-1 cursor-pointer"
                    title="Anhang löschen"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

        {/* Child node creation in 4 directions */}
        <Section title="Unterknoten hinzufügen">
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <button
              onClick={() => onAddChild(node.id, 'right')}
              className="py-1.5 px-2.5 rounded bg-bg-secondary hover:bg-bg-tertiary text-[11.5px] text-text-primary font-medium flex items-center justify-center gap-1.5 border border-border/60 transition-colors cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> Rechts
            </button>
            <button
              onClick={() => onAddChild(node.id, 'left')}
              className="py-1.5 px-2.5 rounded bg-bg-secondary hover:bg-bg-tertiary text-[11.5px] text-text-primary font-medium flex items-center justify-center gap-1.5 border border-border/60 transition-colors cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> Links
            </button>
            <button
              onClick={() => onAddChild(node.id, 'top')}
              className="py-1.5 px-2.5 rounded bg-bg-secondary hover:bg-bg-tertiary text-[11.5px] text-text-primary font-medium flex items-center justify-center gap-1.5 border border-border/60 transition-colors cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> Oben
            </button>
            <button
              onClick={() => onAddChild(node.id, 'bottom')}
              className="py-1.5 px-2.5 rounded bg-bg-secondary hover:bg-bg-tertiary text-[11.5px] text-text-primary font-medium flex items-center justify-center gap-1.5 border border-border/60 transition-colors cursor-pointer"
            >
              <Plus size={12} strokeWidth={2.5} /> Unten
            </button>
          </div>
        </Section>

        {/* Linked Notes */}
        <Section
          title="Notizen"
          count={linkedNotes.length}
          action={
            <button
              onClick={() => setShowLinkNote(true)}
              className="text-[11px] text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Link size={10} strokeWidth={2.5} /> Verknüpfen
            </button>
          }
        >
          {linkedNotes.length === 0 ? (
            <p className="text-[11.5px] text-text-disabled">–</p>
          ) : (
            linkedNotes.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-1 group">
                <button
                  className="text-[12px] text-accent hover:underline truncate cursor-pointer"
                  onClick={() => navigate(`/projects/${projectId}/notes/${n.id}`)}
                >
                  {n.title}
                </button>
                <button
                  onClick={() => unlinkNoteFromNode(n.id, node.id)}
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-text-disabled hover:text-danger transition-all p-1 cursor-pointer"
                  title="Verknüpfung aufheben"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </Section>

        {/* Linked Flashcards */}
        <Section
          title="Karteikarten"
          count={linkedFlashcards.length}
          action={
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewFlashcard(true)}
                className="text-[11px] text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={10} strokeWidth={2.5} /> Neu
              </button>
              <button
                onClick={() => setShowLinkFlashcard(true)}
                className="text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-0.5 cursor-pointer"
              >
                <Link size={10} strokeWidth={2.5} /> Verknüpfen
              </button>
            </div>
          }
        >
          {linkedFlashcards.length === 0 ? (
            <p className="text-[11.5px] text-text-disabled">–</p>
          ) : (
            linkedFlashcards.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-1 group">
                <span className="text-[12px] text-text-primary truncate">{f.front}</span>
                <button
                  onClick={() => unlinkFlashcardFromNode(f.id, node.id)}
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-text-disabled hover:text-danger transition-all p-1 cursor-pointer"
                  title="Verknüpfung aufheben"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </Section>

        {/* Linked Taskcards */}
        <Section
          title="Taskcards"
          count={linkedTaskcards.length}
          action={
            <button
              onClick={() => setShowLinkTaskcard(true)}
              className="text-[11px] text-accent hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Link size={10} strokeWidth={2.5} /> Verknüpfen
            </button>
          }
        >
          {linkedTaskcards.length === 0 ? (
            <p className="text-[11.5px] text-text-disabled">–</p>
          ) : (
            linkedTaskcards.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1 group">
                <span className="text-[12px] text-text-primary truncate">{t.title || 'Taskcard'}</span>
                <button
                  onClick={() => unlinkTaskcardFromNode(t.id, node.id)}
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 text-text-disabled hover:text-danger transition-all p-1 cursor-pointer"
                  title="Verknüpfung aufheben"
                >
                  <X size={12} />
                </button>
              </div>
            ))
          )}
        </Section>
      </div>

      {/* Footer action: Delete node */}
      {onDeleteNode && (
        <div className="p-3 border-t border-border shrink-0 bg-bg-secondary/30">
          <button
            onClick={() => onDeleteNode(node.id)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded text-[11.5px] text-danger hover:bg-danger/10 border border-danger/30 transition-colors"
          >
            <Trash2 size={12} /> Knoten löschen
          </button>
        </div>
      )}

      {/* Link Note Modal */}
      <Modal isOpen={showLinkNote} onClose={() => setShowLinkNote(false)} title="Notiz verknüpfen" size="sm">
        <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
          {projectNotes.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-4 text-center">Noch keine Notizen vorhanden</p>
          ) : (
            projectNotes.map((n) => {
              const linked = node.linkedNoteIds.includes(n.id);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (linked) unlinkNoteFromNode(n.id, node.id);
                    else linkNoteToNode(n.id, node.id);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-[12px] text-left transition-colors',
                    linked ? 'bg-accent-muted text-accent' : 'hover:bg-bg-secondary text-text-primary'
                  )}
                >
                  <span>{n.title}</span>
                  {linked && <span className="text-[10px] text-accent">✓</span>}
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="secondary" onClick={() => setShowLinkNote(false)}>Schließen</Button>
        </div>
      </Modal>

      {/* Link Flashcard Modal */}
      <Modal isOpen={showLinkFlashcard} onClose={() => setShowLinkFlashcard(false)} title="Karteikarte verknüpfen" size="sm">
        <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
          {projectFlashcards.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-4 text-center">Noch keine Karteikarten vorhanden</p>
          ) : (
            projectFlashcards.map((f) => {
              const linked = node.linkedFlashcardIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    if (linked) unlinkFlashcardFromNode(f.id, node.id);
                    else linkFlashcardToNode(f.id, node.id);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-[12px] text-left transition-colors',
                    linked ? 'bg-accent-muted text-accent' : 'hover:bg-bg-secondary text-text-primary'
                  )}
                >
                  <span className="truncate">{f.front}</span>
                  {linked && <span className="text-[10px] text-accent">✓</span>}
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="secondary" onClick={() => setShowLinkFlashcard(false)}>Schließen</Button>
        </div>
      </Modal>

      {/* Link Taskcard Modal */}
      <Modal isOpen={showLinkTaskcard} onClose={() => setShowLinkTaskcard(false)} title="Taskcard verknüpfen" size="sm">
        <div className="space-y-0.5 max-h-64 overflow-y-auto scrollbar-thin">
          {projectTaskcards.length === 0 ? (
            <p className="text-[12px] text-text-disabled py-4 text-center">Noch keine Taskcards vorhanden</p>
          ) : (
            projectTaskcards.map((t) => {
              const linked = node.linkedTaskcardIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (linked) unlinkTaskcardFromNode(t.id, node.id);
                    else linkTaskcardToNode(t.id, node.id);
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-2.5 py-1.5 rounded-sm text-[12px] text-left transition-colors',
                    linked ? 'bg-accent-muted text-accent' : 'hover:bg-bg-secondary text-text-primary'
                  )}
                >
                  <span className="truncate">{t.title || 'Taskcard'}</span>
                  {linked && <span className="text-[10px] text-accent">✓</span>}
                </button>
              );
            })
          )}
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="secondary" onClick={() => setShowLinkTaskcard(false)}>Schließen</Button>
        </div>
      </Modal>

      {/* New Flashcard Modal */}
      <Modal isOpen={showNewFlashcard} onClose={() => setShowNewFlashcard(false)} title="Neue Karteikarte" size="sm">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">Frage</label>
            <textarea
              value={fcFront}
              onChange={(e) => setFcFront(e.target.value)}
              placeholder="Frage oder Begriff…"
              rows={2}
              className="w-full border border-border-strong rounded px-2.5 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-disabled outline-none focus:border-accent resize-none transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10.5px] font-semibold uppercase tracking-wider text-text-secondary block mb-1">Antwort</label>
            <textarea
              value={fcBack}
              onChange={(e) => setFcBack(e.target.value)}
              placeholder="Antwort oder Definition…"
              rows={3}
              className="w-full border border-border-strong rounded px-2.5 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-disabled outline-none focus:border-accent resize-none transition-colors"
            />
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <Button variant="secondary" onClick={() => setShowNewFlashcard(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={handleCreateFlashcard} disabled={!fcFront.trim()}>Erstellen</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Section helper ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, count, action, children }) => (
  <div className="px-4 py-3 border-b border-border last:border-0">
    <div className="flex items-center justify-between mb-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest">{title}</span>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] bg-bg-secondary text-text-disabled px-1 rounded-sm">{count}</span>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
);
