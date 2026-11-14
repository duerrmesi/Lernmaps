import React, { useState, useRef, useEffect } from 'react';
import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from '@xyflow/react';
import { Check, Trash2, Pencil, Plus } from 'lucide-react';

export const MindmapEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  markerEnd,
  data,
}) => {
  const offsetSourceX = (data?.offsetSourceX as number) || 0;
  const offsetSourceY = (data?.offsetSourceY as number) || 0;
  const offsetTargetX = (data?.offsetTargetX as number) || 0;
  const offsetTargetY = (data?.offsetTargetY as number) || 0;

  const sx = sourceX + offsetSourceX;
  const sy = sourceY + offsetSourceY;
  const tx = targetX + offsetTargetX;
  const ty = targetY + offsetTargetY;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    curvature: 0.28,
  });

  const label = (data?.label as string) || '';
  const isEditing = Boolean(data?.isEditing);
  const onUpdateLabel = data?.onUpdateLabel as ((text: string) => void) | undefined;
  const onDeleteEdge = data?.onDeleteEdge as (() => void) | undefined;
  const onStartEdit = data?.onStartEdit as (() => void) | undefined;
  const onCancelEdit = data?.onCancelEdit as (() => void) | undefined;

  const [editText, setEditText] = useState(label);
  const [prevLabel, setPrevLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  if (prevLabel !== label) {
    setPrevLabel(label);
    setEditText(label);
  }

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
    }
  }, [isEditing]);

  const handleCommit = () => {
    onUpdateLabel?.(editText.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleCommit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditText(label);
      onCancelEdit?.();
    }
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd || (selected ? 'url(#mindmap-arrow-selected)' : 'url(#mindmap-arrow)')}
        style={{
          ...style,
          stroke: selected ? '#0D0D0D' : '#8E8E93',
          strokeWidth: selected ? 2.2 : 1.6,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan z-30"
        >
          {isEditing ? (
            <div
              className="flex items-center gap-1 bg-white rounded-full px-2 py-0.5 shadow-md border-2 border-[#0D0D0D] transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCommit}
                placeholder="Beschriftung..."
                className="text-[11px] font-medium text-text-primary bg-transparent outline-none w-28 px-1 py-0.5"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleCommit();
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center bg-[#0D0D0D] text-white hover:bg-accent hover:scale-105 transition-all cursor-pointer shrink-0"
                title="Speichern (Enter)"
              >
                <Check size={9} strokeWidth={2.5} />
              </button>
              {onDeleteEdge && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onDeleteEdge();
                  }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-text-disabled hover:text-danger hover:bg-danger/10 transition-all cursor-pointer shrink-0"
                  title="Verbindung löschen"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ) : label ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit?.();
              }}
              className="group/edgelabel flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-border shadow-xs hover:border-[#0D0D0D] hover:shadow-sm text-[11px] font-medium text-text-primary cursor-pointer transition-all hover:scale-105 select-none"
              title="Klicken zum Bearbeiten des Pfeiltexts"
            >
              <span className="max-w-[170px] truncate">{label}</span>
              <Pencil size={9} className="text-text-disabled opacity-0 group-hover/edgelabel:opacity-100 transition-opacity shrink-0" />
              {onDeleteEdge && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteEdge();
                  }}
                  className="opacity-0 group-hover/edgelabel:opacity-100 p-0.5 text-text-disabled hover:text-danger rounded hover:bg-danger/10 transition-all shrink-0 cursor-pointer"
                  title="Verbindung löschen"
                >
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ) : selected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit?.();
              }}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/95 hover:bg-white text-text-secondary hover:text-[#0D0D0D] border border-dashed border-border hover:border-[#0D0D0D] text-[10px] font-medium shadow-xs cursor-pointer transition-all hover:scale-105 select-none"
              title="Klicken, um Text auf diesen Pfeil zu schreiben"
            >
              <Plus size={9} />
              <span>Text</span>
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
