import React, { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, Edit2, Check, Pencil, MousePointer2 } from 'lucide-react';
import { useStore, useTaskcardsByProject } from '../../store';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';
import type { Taskcard, TaskcardColor } from '../../types';
import { DrawingOverlay } from '../canvas/DrawingOverlay';

const COLOR_LABELS: Record<TaskcardColor, string> = {
  default: 'Standard',
  yellow: 'Wichtig',
  blue: 'Definition',
  green: 'Beispiel',
  red: 'Achtung',
};

const COLOR_STYLES: Record<TaskcardColor, string> = {
  default: 'bg-white border-border',
  yellow: 'bg-[#FFFBEB] border-[#FDE68A]',
  blue: 'bg-[#EFF6FF] border-[#BFDBFE]',
  green: 'bg-[#F0FDF4] border-[#BBF7D0]',
  red: 'bg-[#FEF2F2] border-[#FECACA]',
};

const COLOR_DOT: Record<TaskcardColor, string> = {
  default: 'bg-border',
  yellow: 'bg-yellow-300',
  blue: 'bg-blue-300',
  green: 'bg-green-300',
  red: 'bg-red-300',
};

export const TaskcardsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, createTaskcard, updateTaskcard, deleteTaskcard } = useStore();
  const cards = useTaskcardsByProject(projectId || '');
  const project = projectId ? projects[projectId] : null;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const canvasSize = { w: 2000, h: 1400 };

  const handleAddCard = () => {
    if (!projectId) return;
    // Add near center of viewport
    const canvas = canvasRef.current;
    const offsetX = canvas ? canvas.scrollLeft + canvas.clientWidth / 2 - 110 : 100;
    const offsetY = canvas ? canvas.scrollTop + canvas.clientHeight / 2 - 60 : 100;
    createTaskcard(projectId, '', { x: offsetX, y: offsetY });
  };

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, cardId: string) => {
    if (editingId) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setSelectedId(cardId);
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const startX = e.clientX - card.position.x;
    const startY = e.clientY - card.position.y;
    setDragging(cardId);

    const handlePointerMove = (pe: PointerEvent) => {
      updateTaskcard(cardId, {
        position: {
          x: Math.max(0, pe.clientX - startX),
          y: Math.max(0, pe.clientY - startY),
        },
      });
    };

    const handlePointerUp = (pe: PointerEvent) => {
      try {
        target.releasePointerCapture(pe.pointerId);
      } catch {}
      setDragging(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }, [cards, editingId, updateTaskcard]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border bg-white">
        <div className="flex items-center gap-2">
          {project && (
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={13} /> {project.title}
            </button>
          )}
          <span className="text-text-disabled text-xs">/</span>
          <span className="text-xs font-medium text-text-primary">Taskcards</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Drawing mode toggle */}
          <div className="flex items-center rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setIsDrawingMode(false)}
              title="Zeiger-Modus"
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors',
                !isDrawingMode ? 'bg-text-primary text-white' : 'bg-white text-text-secondary hover:bg-bg-secondary'
              )}
            >
              <MousePointer2 size={12} />
            </button>
            <button
              onClick={() => setIsDrawingMode(true)}
              title="Zeichen-Modus"
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors border-l border-border',
                isDrawingMode ? 'bg-text-primary text-white' : 'bg-white text-text-secondary hover:bg-bg-secondary'
              )}
            >
              <Pencil size={12} />
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={handleAddCard} disabled={isDrawingMode}>
            <Plus size={13} /> Neue Karte
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto bg-[#F8F8F8] relative"
        style={{
          backgroundImage: 'radial-gradient(circle, #D8D8D8 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      >
        <div className="relative" style={{ minWidth: `${canvasSize.w}px`, minHeight: `${canvasSize.h}px` }}>
          {/* Drawing overlay */}
          <DrawingOverlay
            canvasId={`taskcards-${projectId}`}
            isDrawingMode={isDrawingMode}
          />
          {cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-sm text-text-disabled mb-1">Noch keine Taskcards</p>
                <p className="text-xs text-text-disabled">Klicke auf „Neue Karte" um loszulegen</p>
              </div>
            </div>
          )}

          {cards.map(card => (
            <TaskcardItem
              key={card.id}
              card={card}
              isDragging={dragging === card.id}
              isSelected={selectedId === card.id}
              isEditing={editingId === card.id}
              onPointerDown={(e) => handlePointerDown(e, card.id)}
              onSelect={() => setSelectedId(card.id)}
              onEdit={() => setEditingId(card.id)}
              onStopEdit={() => setEditingId(null)}
              onUpdate={(updates) => updateTaskcard(card.id, updates)}
              onDelete={() => {
                deleteTaskcard(card.id);
                if (selectedId === card.id) setSelectedId(null);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Taskcard Item ───────────────────────────────────────────────────────────

interface TaskcardItemProps {
  card: Taskcard;
  isDragging: boolean;
  isSelected: boolean;
  isEditing: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<Taskcard>) => void;
  onDelete: () => void;
}

const TaskcardItem: React.FC<TaskcardItemProps> = ({
  card, isDragging, isSelected, isEditing, onPointerDown, onSelect, onEdit, onStopEdit, onUpdate, onDelete,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div
      className={cn(
        'absolute rounded border shadow-sm group select-none transition-shadow touch-none',
        COLOR_STYLES[card.color],
        isDragging ? 'shadow-panel cursor-grabbing' : 'cursor-grab hover:shadow-dropdown',
        isEditing && 'cursor-default',
        isSelected && 'ring-2 ring-accent/60'
      )}
      style={{ left: card.position.x, top: card.position.y, width: card.width, minHeight: card.height }}
      onPointerDown={isEditing ? undefined : onPointerDown}
      onClick={() => { if (!isEditing) onSelect(); }}
      onDoubleClick={() => onEdit()}
    >
      {/* Actions */}
      <div className={cn(
        "absolute -top-3 right-0 flex gap-1.5 pr-1 z-10 transition-opacity",
        isSelected || isEditing ? "opacity-100" : "opacity-100 sm:opacity-0 group-hover:opacity-100"
      )}>
        {/* Color picker */}
        <div className="relative">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(p => !p); }}
            className="w-6 h-6 rounded-full border border-border bg-white flex items-center justify-center shadow-sm cursor-pointer"
            title="Farbe wählen"
          >
            <span className={cn('w-3 h-3 rounded-full', COLOR_DOT[card.color])} />
          </button>
          {showColorPicker && (
            <div className="absolute top-7 right-0 z-20 bg-white border border-border rounded-lg shadow-dropdown p-2 flex gap-1.5">
              {(Object.keys(COLOR_LABELS) as TaskcardColor[]).map(c => (
                <button
                  key={c}
                  title={COLOR_LABELS[c]}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowColorPicker(false); }}
                  className={cn('w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer', COLOR_DOT[c], card.color === c ? 'border-text-primary' : 'border-transparent')}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm hover:bg-bg-secondary cursor-pointer"
          title="Bearbeiten"
        >
          <Edit2 size={11} className="text-text-secondary" />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm hover:bg-danger-light cursor-pointer"
          title="Löschen"
        >
          <Trash2 size={11} className="text-danger" />
        </button>
      </div>

      {isEditing ? (
        <div className="p-3" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-disabled uppercase tracking-wider">Bearbeiten</span>
            <button onClick={onStopEdit} className="text-text-disabled hover:text-text-primary">
              <Check size={13} />
            </button>
          </div>
          <input
            value={card.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titel (optional)"
            className="w-full text-xs font-semibold text-text-secondary uppercase tracking-wider bg-transparent outline-none border-b border-border/50 pb-1 mb-2 placeholder:text-text-disabled"
          />
          <textarea
            value={card.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Inhalt…"
            autoFocus
            rows={4}
            className="w-full text-sm text-text-primary bg-transparent outline-none resize-none placeholder:text-text-disabled"
          />
        </div>
      ) : (
        <div className="p-3" onDoubleClick={onEdit}>
          {card.title && (
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              {card.title}
            </p>
          )}
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {card.content || <span className="text-text-disabled italic">Doppelklick zum Bearbeiten</span>}
          </p>
        </div>
      )}
    </div>
  );
};
