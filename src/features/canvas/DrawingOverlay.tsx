import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pen, Highlighter, Eraser, Trash2, Undo2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useStore } from '../../store';
import type { DrawingStroke, DrawingTool, Point } from './drawingTypes';
import { generateId } from '../../utils';

// ─── Colour palette ────────────────────────────────────────────────────────
const PEN_COLORS = [
  { label: 'Tinte',    value: '#171717' },
  { label: 'Blau',    value: '#2563EB' },
  { label: 'Rot',     value: '#DC2626' },
  { label: 'Grün',    value: '#16A34A' },
];

const HIGHLIGHTER_COLORS = [
  { label: 'Gelb',   value: '#FDE047' },
  { label: 'Grün',   value: '#86EFAC' },
  { label: 'Blau',   value: '#93C5FD' },
  { label: 'Pink',   value: '#F9A8D4' },
];

const TOOL_CONFIG: Record<DrawingTool, { width: number; opacity: number }> = {
  pen:         { width: 2,  opacity: 1   },
  highlighter: { width: 18, opacity: 0.4 },
  eraser:      { width: 24, opacity: 1   },
};

interface DrawingOverlayProps {
  canvasId: string;
  /** Controlled from parent: when false the overlay is pointer-none (interact mode) */
  isDrawingMode: boolean;
  transform?: { x: number; y: number; zoom: number };
}

export const DrawingOverlay: React.FC<DrawingOverlayProps> = ({
  canvasId,
  isDrawingMode,
  transform = { x: 0, y: 0, zoom: 1 },
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { drawings, setDrawings } = useStore();
  const { x, y, zoom } = transform;

  const strokes: DrawingStroke[] = drawings[canvasId] ?? [];
  const strokesRef = useRef<DrawingStroke[]>(strokes);
  strokesRef.current = strokes;

  const [tool, setTool]     = useState<DrawingTool>('pen');
  const [color, setColor]   = useState('#171717');
  const currentStrokeRef    = useRef<DrawingStroke | null>(null);
  const isDrawingRef        = useRef(false);

  // Resize canvas to always match window size
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Render all strokes onto the canvas ────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(zoom, zoom);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha    = stroke.opacity;
      ctx.strokeStyle    = stroke.tool === 'eraser' ? '#00000000' : stroke.color;
      // Fixed width in world space, but visual scaling happens via context
      ctx.lineWidth      = stroke.width;
      ctx.lineCap        = 'round';
      ctx.lineJoin       = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
      }
      const last = stroke.points[stroke.points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.restore();
  }, [x, y, zoom]);

  useEffect(() => { redraw(); }, [strokes, size, redraw]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // Transform from screen coordinates back to "React Flow world" coordinates
    return {
      x: (screenX - x) / zoom,
      y: (screenY - y) / zoom
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const cfg = TOOL_CONFIG[tool];
    const stroke: DrawingStroke = {
      id:      generateId(),
      tool,
      color:   tool === 'eraser' ? '#ffffff' : color,
      width:   cfg.width,
      opacity: cfg.opacity,
      points:  [getPos(e)],
    };
    currentStrokeRef.current = stroke;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(getPos(e));

    // Live preview: append current stroke to permanent ones for redraw
    strokesRef.current = [...strokes, currentStrokeRef.current];
    redraw();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.points.length > 1) {
      setDrawings(canvasId, [...strokes, currentStrokeRef.current]);
    }
    currentStrokeRef.current = null;
    strokesRef.current = strokes;
  };

  const handleUndo = () => {
    const updated = strokes.slice(0, -1);
    setDrawings(canvasId, updated);
  };

  const handleClear = () => {
    if (window.confirm('Alle Zeichnungen löschen?')) {
      setDrawings(canvasId, []);
    }
  };

  const colors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;

  return (
    <>
      {/* Canvas layer — fills the parent completely without CSS transform */}
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 10,
          touchAction: isDrawingMode ? 'none' : 'auto',
        }}
        className={cn(
          isDrawingMode ? 'pointer-events-auto' : 'pointer-events-none',
          tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Floating toolbar — only shown when drawing mode is active */}
      {isDrawingMode && (
        <div
          style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}
          className="flex items-center gap-1.5 bg-white border border-border rounded-xl shadow-modal px-3.5 py-2 select-none"
        >
          {/* Tool buttons */}
          <ToolBtn active={tool === 'pen'} onClick={() => setTool('pen')} title="Stift">
            <Pen size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'highlighter'} onClick={() => setTool('highlighter')} title="Marker">
            <Highlighter size={15} />
          </ToolBtn>
          <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} title="Radierer">
            <Eraser size={15} />
          </ToolBtn>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Colour swatches */}
          {tool !== 'eraser' && colors.map((c) => (
            <button
              key={c.value}
              title={c.label}
              onClick={() => setColor(c.value)}
              className={cn(
                'w-5 h-5 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer',
                color === c.value ? 'ring-2 ring-offset-1 ring-text-primary scale-110' : ''
              )}
              style={{
                backgroundColor: c.value,
                opacity: tool === 'highlighter' ? 0.6 : 1,
              }}
            />
          ))}

          <div className="w-px h-6 bg-border mx-1" />

          {/* Undo / Clear */}
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            title="Rückgängig"
            className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded hover:bg-bg-secondary text-text-secondary disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            title="Alles löschen"
            className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded hover:bg-danger-light text-danger disabled:opacity-30 transition-colors cursor-pointer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </>
  );
};

// ─── Small helper component ────────────────────────────────────────────────
const ToolBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    title={title}
    onClick={onClick}
    className={cn(
      'p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer',
      active
        ? 'bg-text-primary text-white'
        : 'text-text-secondary hover:bg-bg-secondary'
    )}
  >
    {children}
  </button>
);
