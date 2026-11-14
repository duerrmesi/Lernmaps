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

  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    if (editingId) return;
    e.preventDefault();
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const startX = e.clientX - card.position.x;
    const startY = e.clientY - card.position.y;
    setDragging(cardId);

    const handleMouseMove = (me: MouseEvent) => {
      updateTaskcard(cardId, {
        position: {
          x: Math.max(0, me.clientX - startX),
          y: Math.max(0, me.clientY - startY),
        },
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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
              isEditing={editingId === card.id}
              onMouseDown={(e) => handleMouseDown(e, card.id)}
              onEdit={() => setEditingId(card.id)}
              onStopEdit={() => setEditingId(null)}
              onUpdate={(updates) => updateTaskcard(card.id, updates)}
              onDelete={() => deleteTaskcard(card.id)}
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
  isEditing: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onStopEdit: () => void;
  onUpdate: (updates: Partial<Taskcard>) => void;
  onDelete: () => void;
}

const TaskcardItem: React.FC<TaskcardItemProps> = ({
  card, isDragging, isEditing, onMouseDown, onEdit, onStopEdit, onUpdate, onDelete,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div
      className={cn(
        'absolute rounded border shadow-sm group select-none transition-shadow',
        COLOR_STYLES[card.color],
        isDragging ? 'shadow-panel cursor-grabbing' : 'cursor-grab hover:shadow-dropdown',
        isEditing && 'cursor-default'
      )}
      style={{ left: card.position.x, top: card.position.y, width: card.width, minHeight: card.height }}
      onMouseDown={isEditing ? undefined : onMouseDown}
    >
      {/* Actions */}
      <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pr-1">
        {/* Color picker */}
        <div className="relative">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(p => !p); }}
            className="w-5 h-5 rounded-full border border-border bg-white flex items-center justify-center shadow-sm"
          >
            <span className={cn('w-2.5 h-2.5 rounded-full', COLOR_DOT[card.color])} />
          </button>
          {showColorPicker && (
            <div className="absolute top-6 right-0 z-10 bg-white border border-border rounded shadow-dropdown p-2 flex gap-1">
              {(Object.keys(COLOR_LABELS) as TaskcardColor[]).map(c => (
                <button
                  key={c}
                  title={COLOR_LABELS[c]}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onUpdate({ color: c }); setShowColorPicker(false); }}
                  className={cn('w-4 h-4 rounded-full border-2 transition-transform hover:scale-110', COLOR_DOT[c], card.color === c ? 'border-text-primary' : 'border-transparent')}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center shadow-sm hover:bg-bg-secondary"
        >
          <Edit2 size={10} className="text-text-secondary" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center shadow-sm hover:bg-danger-light"
        >
          <Trash2 size={10} className="text-danger" />
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
