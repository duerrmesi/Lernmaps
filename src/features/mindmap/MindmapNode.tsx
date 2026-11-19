import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, Trash2, Check, FileText, Link2, Edit2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { NodeAttachment, NodeFontSize, NodeImageSize } from '../../types';
import { formatFileSize } from '../../utils/attachmentStorage';

interface MindmapNodeData {
  label: string;
  nodeId: string;
  isRoot: boolean;
  isSelected: boolean;
  attachments?: NodeAttachment[];
  fontSize?: NodeFontSize;
  imageSize?: NodeImageSize;
  fontScale?: number;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string, direction?: 'right' | 'left' | 'top' | 'bottom') => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onExpandImage?: (attachment: NodeAttachment) => void;
  onOpenFile?: (attachment: NodeAttachment) => void;
  isConnectingSource?: boolean;
  isConnectingCandidate?: boolean;
  onStartConnecting?: (nodeId: string) => void;
  onCompleteConnecting?: (targetNodeId: string) => void;
  [key: string]: unknown;
}

interface FontMetrics {
  fontSizePx: number;
  lineHeightPx: number;
  minWidthPx: number;
  maxWidthPx: number;
  paddingY: number;
  paddingX: number;
  weightClass: string;
}

const FONT_METRICS: Record<NodeFontSize, FontMetrics> = {
  sm: {
    fontSizePx: 11,
    lineHeightPx: 14,
    minWidthPx: 100,
    maxWidthPx: 200,
    paddingY: 6,
    paddingX: 10,
    weightClass: 'font-normal',
  },
  md: {
    fontSizePx: 12.5,
    lineHeightPx: 16,
    minWidthPx: 120,
    maxWidthPx: 250,
    paddingY: 8,
    paddingX: 12,
    weightClass: 'font-normal',
  },
  lg: {
    fontSizePx: 15,
    lineHeightPx: 19,
    minWidthPx: 150,
    maxWidthPx: 300,
    paddingY: 10,
    paddingX: 14,
    weightClass: 'font-medium',
  },
  xl: {
    fontSizePx: 18,
    lineHeightPx: 23,
    minWidthPx: 170,
    maxWidthPx: 360,
    paddingY: 12,
    paddingX: 16,
    weightClass: 'font-semibold',
  },
};

const IMAGE_HEIGHT_CLASSES: Record<NodeImageSize, { single: string; grid: string }> = {
  sm: { single: 'max-h-[65px] h-[65px]', grid: 'h-[50px]' },
  md: { single: 'max-h-[110px] h-[110px]', grid: 'h-[75px]' },
  lg: { single: 'max-h-[180px] h-[180px]', grid: 'h-[115px]' },
  xl: { single: 'max-h-[260px] h-[260px]', grid: 'h-[150px]' },
};

export const MindmapNodeComponent = memo(({ data, selected }: NodeProps) => {
  const d = data as MindmapNodeData;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(d.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setEditValue(d.label);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, d.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleRenameCommit = () => {
    const val = editValue.trim();
    if (val && val !== d.label) {
      d.onRename(d.nodeId, val);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameCommit();
    if (e.key === 'Escape') {
      setEditing(false);
      setEditValue(d.label);
    }
  };

  const isActive = selected || d.isSelected;
  const images = d.attachments?.filter((a) => a.type === 'image') || [];
  const files = d.attachments?.filter((a) => a.type === 'file') || [];

  const fontSize: NodeFontSize = d.fontSize || (d.isRoot ? 'lg' : 'md');
  const imageSize: NodeImageSize = d.imageSize || 'md';
  const metrics = FONT_METRICS[fontSize] || FONT_METRICS.md;
  const imgCfg = IMAGE_HEIGHT_CLASSES[imageSize] || IMAGE_HEIGHT_CLASSES.md;
  const fontScale = d.fontScale && d.fontScale > 0 ? d.fontScale : 1;

  const currentFontSize = Math.round(metrics.fontSizePx * fontScale);
  const currentLineHeight = Math.round(metrics.lineHeightPx * fontScale);
  const currentMinWidth = Math.round(metrics.minWidthPx * Math.min(fontScale, 1.8));
  const currentMaxWidth = Math.round(metrics.maxWidthPx * fontScale);
  const currentPadY = Math.round(metrics.paddingY * Math.min(fontScale, 1.35));
  const currentPadX = Math.round(metrics.paddingX * Math.min(fontScale, 1.35));

  return (
    <div
      className={cn(
        'group relative bg-white border rounded-sm shadow-sm transition-all duration-100 cursor-pointer select-none',
        d.isConnectingSource
          ? 'border-[#0D0D0D] border-2 ring-4 ring-[#0D0D0D]/15 shadow-md'
          : d.isConnectingCandidate
          ? 'border-dashed border-2 border-accent bg-accent/5 ring-2 ring-accent/30 hover:bg-accent/15 hover:border-accent hover:scale-[1.02]'
          : isActive
          ? 'border-[#0D0D0D] border-[1.5px] shadow-md'
          : d.isRoot
          ? 'border-[#0D0D0D] border-[1.5px]'
          : 'border-border hover:border-border-strong'
      )}
      style={{
        minWidth: `${currentMinWidth}px`,
        maxWidth: `${currentMaxWidth}px`,
        padding: `${currentPadY}px ${currentPadX}px`,
      }}
      onClick={() => {
        if (d.isConnectingCandidate) {
          d.onCompleteConnecting?.(d.nodeId);
        } else if (d.isConnectingSource) {
          d.onStartConnecting?.('');
        } else {
          d.onSelect(d.nodeId);
        }
      }}
    >
      {/* Connecting indicators */}
      {d.isConnectingSource && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0D0D0D] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md pointer-events-none z-30 animate-bounce">
          Startknoten
        </div>
      )}
      {d.isConnectingCandidate && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-accent text-white text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap shadow-md pointer-events-none z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          Hierhin verbinden
        </div>
      )}

      {/* 4 Handles for all 4 directions */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !opacity-0 !top-0"
        isConnectable={true}
      />
      <Handle
        id="source-top"
        type="source"
        position={Position.Top}
        className="!w-4 !h-4 !opacity-0 !top-0"
        isConnectable={true}
      />

      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className="!w-4 !h-4 !opacity-0 !bottom-0"
        isConnectable={true}
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !opacity-0 !bottom-0"
        isConnectable={true}
      />

      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !opacity-0 !left-0"
        isConnectable={true}
      />
      <Handle
        id="source-left"
        type="source"
        position={Position.Left}
        className="!w-4 !h-4 !opacity-0 !left-0"
        isConnectable={true}
      />

      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className="!w-4 !h-4 !opacity-0 !right-0"
        isConnectable={true}
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !opacity-0 !right-0"
        isConnectable={true}
      />

      {/* Label / Inline Editor */}
      {editing ? (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRenameCommit}
            className="text-text-primary bg-transparent outline-none w-full min-w-[70px] border-b border-accent"
            style={{
              fontSize: `${currentFontSize}px`,
              lineHeight: `${currentLineHeight}px`,
            }}
          />
          <button onClick={handleRenameCommit} className="text-accent shrink-0 p-1">
            <Check size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'text-text-primary block break-words flex-1',
              metrics.weightClass,
              d.isRoot && 'font-semibold'
            )}
            style={{
              fontSize: `${currentFontSize}px`,
              lineHeight: `${currentLineHeight}px`,
            }}
            onDoubleClick={handleDoubleClick}
            title="Doppelklick oder Stiftsymbol zum Umbenennen"
          >
            {d.label}
          </span>
          {isActive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1 rounded text-text-disabled hover:text-text-primary hover:bg-bg-secondary shrink-0 transition-colors cursor-pointer"
              title="Knoten umbenennen"
            >
              <Edit2 size={11} />
            </button>
          )}
        </div>
      )}

      {/* Attachments: Images */}
      {images.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1">
          {images.length === 1 ? (
            <div className="rounded overflow-hidden border border-border/60 bg-bg-secondary">
              <img
                src={images[0].dataUrl}
                alt={images[0].name}
                className={cn(
                  'w-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity',
                  imgCfg.single
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  d.onExpandImage?.(images[0]);
                }}
                title="Klicken zum Vergrößern"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {images.map((img) => (
                <div key={img.id} className="rounded overflow-hidden border border-border/60 bg-bg-secondary">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    className={cn(
                      'w-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity',
                      imgCfg.grid
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      d.onExpandImage?.(img);
                    }}
                    title="Klicken zum Vergrößern"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachments: Files */}
      {files.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-1">
          {files.map((file) => (
            <div
              key={file.id}
              onClick={(e) => {
                e.stopPropagation();
                d.onOpenFile?.(file);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                d.onOpenFile?.(file);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-bg-secondary hover:bg-bg-tertiary border border-border/50 text-[11px] text-text-primary transition-colors cursor-pointer group/file"
              title={`${file.name} (Klicken zum Öffnen)`}
            >
              <FileText size={13} className="shrink-0 text-text-secondary group-hover/file:text-text-primary" />
              <span
                className="truncate flex-1 font-medium"
                style={{ fontSize: `${Math.round(11 * Math.min(fontScale, 1.4))}px` }}
              >
                {file.name}
              </span>
              <span className="text-[9px] text-text-disabled shrink-0">{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action: Delete button at top-right corner */}
      {!editing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            d.onDelete(d.nodeId);
          }}
          className={cn(
            "absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white border border-border text-text-disabled hover:text-danger hover:border-danger hover:scale-110 flex items-center justify-center shadow transition-all z-20 cursor-pointer",
            isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
          )}
          title="Knoten löschen"
        >
          <Trash2 size={11} />
        </button>
      )}

      {/* Action: Connect button at top-left corner */}
      {!editing && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (d.isConnectingSource) {
              d.onStartConnecting?.('');
            } else {
              d.onStartConnecting?.(d.nodeId);
            }
          }}
          className={cn(
            'absolute -top-3 -left-3 w-6 h-6 rounded-full bg-white border border-border text-text-secondary hover:text-white hover:bg-[#0D0D0D] hover:border-[#0D0D0D] hover:scale-110 flex items-center justify-center shadow transition-all z-20 cursor-pointer group/connectbtn',
            d.isConnectingSource ? 'opacity-100 bg-[#0D0D0D] text-white border-[#0D0D0D]' : isActive ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100'
          )}
          title="Verbindungslinie ziehen oder Zielknoten auswählen"
        >
          <Link2 size={11} />
          {/* React Flow Source Handle inside the Connect button for drag-to-connect */}
          <Handle
            id="source-connect"
            type="source"
            position={Position.Top}
            className="!w-full !h-full !opacity-0 !top-0 !left-0 !transform-none !border-0 !cursor-crosshair"
            isConnectable={true}
          />
        </div>
      )}

      {/* Actions: 4 Plus buttons on each side */}
      {!editing && (
        <>
          {/* Top Plus */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              d.onAddChild(d.nodeId, 'top');
            }}
            className={cn(
              "absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center hover:bg-accent hover:scale-110 shadow transition-all z-20 cursor-pointer",
              isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
            )}
            title="Knoten oben hinzufügen"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>

          {/* Bottom Plus */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              d.onAddChild(d.nodeId, 'bottom');
            }}
            className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center hover:bg-accent hover:scale-110 shadow transition-all z-20 cursor-pointer",
              isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
            )}
            title="Knoten unten hinzufügen"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>

          {/* Left Plus */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              d.onAddChild(d.nodeId, 'left');
            }}
            className={cn(
              "absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center hover:bg-accent hover:scale-110 shadow transition-all z-20 cursor-pointer",
              isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
            )}
            title="Knoten links hinzufügen"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>

          {/* Right Plus */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              d.onAddChild(d.nodeId, 'right');
            }}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0D0D0D] text-white flex items-center justify-center hover:bg-accent hover:scale-110 shadow transition-all z-20 cursor-pointer",
              isActive ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
            )}
            title="Knoten rechts hinzufügen"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
});

MindmapNodeComponent.displayName = 'MindmapNodeComponent';
