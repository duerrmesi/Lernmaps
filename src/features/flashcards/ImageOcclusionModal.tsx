import React, { useState, useRef } from 'react';
import { Upload, X, Trash2, Check } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import type { OcclusionBox } from '../../types';

interface ImageOcclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    front: string;
    back: string;
    imageUrl: string;
    occlusionBoxes: OcclusionBox[];
    tags: string[];
  }) => void;
}

export const ImageOcclusionModal: React.FC<ImageOcclusionModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [boxes, setBoxes] = useState<OcclusionBox[]>([]);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  // Dragging state for drawing boxes
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle eine gültige Bilddatei (PNG, JPG, WebP) aus.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target?.result as string);
      setBoxes([]);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const getRelativeCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageSrc) return;
    // If clicking on existing box delete button or interaction, don't start new box
    if ((e.target as HTMLElement).closest('.box-control')) return;

    const coords = getRelativeCoords(e);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentPoint(coords);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    setCurrentPoint(getRelativeCoords(e));
  };

  const handleMouseUp = () => {
    if (!isDrawing || !startPoint || !currentPoint) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      return;
    }

    const left = Math.min(startPoint.x, currentPoint.x);
    const top = Math.min(startPoint.y, currentPoint.y);
    const width = Math.abs(currentPoint.x - startPoint.x);
    const height = Math.abs(currentPoint.y - startPoint.y);

    // Only create box if size is meaningful (> 1.5% in both dimensions)
    if (width > 1.5 && height > 1.5) {
      const newBox: OcclusionBox = {
        id: `occ_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        x: Math.round(left * 10) / 10,
        y: Math.round(top * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
        label: `Punkt ${boxes.length + 1}`,
      };
      setBoxes((prev) => [...prev, newBox]);
      setSelectedBoxId(newBox.id);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoint(null);
  };

  const handleDeleteBox = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const handleUpdateBoxLabel = (id: string, label: string) => {
    setBoxes((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)));
  };

  const handleSave = () => {
    if (!imageSrc) {
      alert('Bitte lade ein Bild hoch.');
      return;
    }
    if (boxes.length === 0) {
      alert('Bitte ziehe mindestens eine Okklusion-Box über einen Bereich des Bildes.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const backSummary = boxes
      .map((b, i) => `${i + 1}. ${b.label || 'Verdeckter Bereich'}`)
      .join('\n');

    onSave({
      front: title.trim() || 'Bild-Okklusion',
      back: backSummary,
      imageUrl: imageSrc,
      occlusionBoxes: boxes,
      tags,
    });

    handleClose();
  };

  const handleClose = () => {
    setImageSrc(null);
    setTitle('');
    setTagsInput('');
    setBoxes([]);
    setSelectedBoxId(null);
    onClose();
  };

  if (!isOpen) return null;

  // Compute live preview box while dragging
  const previewBox =
    isDrawing && startPoint && currentPoint
      ? {
          x: Math.min(startPoint.x, currentPoint.x),
          y: Math.min(startPoint.y, currentPoint.y),
          width: Math.abs(currentPoint.x - startPoint.x),
          height: Math.abs(currentPoint.y - startPoint.y),
        }
      : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bild-Okklusion erstellen (Image Occlusion)"
      size="lg"
    >
      <div className="space-y-4">
        {/* Title and tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Titel / Aufgabenstellung
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Beschrifte die Bestandteile..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Tags (kommagetrennt)
            </label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z. B. Anatomie, Klausur, Diagramm"
            />
          </div>
        </div>

        {/* Upload or Canvas */}
        {!imageSrc ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-border-strong hover:bg-bg-secondary/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-accent-light text-accent flex items-center justify-center mb-3">
              <Upload size={22} />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              Klicke hier oder ziehe ein Bild hinein
            </p>
            <p className="text-xs text-text-disabled">PNG, JPG, SVG oder WebP</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span className="flex items-center gap-1.5 font-medium text-text-primary">
                ✏️ Ziehe mit der Maus Rechtecke über die Begriffe, die verdeckt werden sollen.
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-bg-secondary px-2 py-0.5 rounded text-[11px] font-mono">
                  {boxes.length} {boxes.length === 1 ? 'Maske' : 'Masken'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Bild wechseln
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {/* Interactive Image Container */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative max-h-[460px] overflow-hidden rounded-lg border border-border select-none cursor-crosshair flex items-center justify-center bg-black/5"
            >
              <img
                src={imageSrc}
                alt="Occlusion source"
                className="max-h-[460px] w-full object-contain pointer-events-none"
                draggable={false}
              />

              {/* Existing Occlusion Boxes */}
              {boxes.map((box, index) => (
                <div
                  key={box.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBoxId(box.id);
                  }}
                  className={`absolute border-2 rounded transition-all cursor-pointer flex items-center justify-center ${
                    selectedBoxId === box.id
                      ? 'border-accent bg-accent/35 ring-2 ring-accent/40 shadow-sm z-20'
                      : 'border-amber-600 bg-amber-500/70 hover:bg-amber-500/90 z-10'
                  }`}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                  }}
                >
                  <span className="text-[10px] font-bold text-white px-1 py-0.5 bg-black/60 rounded shadow-xs">
                    {index + 1}
                  </span>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteBox(box.id, e)}
                    className="box-control absolute -top-2 -right-2 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-700 shadow cursor-pointer z-30"
                    title="Box entfernen"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}

              {/* Live drawing preview */}
              {previewBox && (
                <div
                  className="absolute border-2 border-dashed border-accent bg-accent/25 pointer-events-none z-30"
                  style={{
                    left: `${previewBox.x}%`,
                    top: `${previewBox.y}%`,
                    width: `${previewBox.width}%`,
                    height: `${previewBox.height}%`,
                  }}
                />
              )}
            </div>

            {/* List / Label Editor for created boxes */}
            {boxes.length > 0 && (
              <div className="bg-bg-secondary p-3 rounded-lg border border-border space-y-2">
                <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Beschriftungen der verdeckten Stellen (Lösungen)
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
                  {boxes.map((box, idx) => (
                    <div
                      key={box.id}
                      className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                        selectedBoxId === box.id
                          ? 'bg-white border border-accent/40 shadow-xs'
                          : 'bg-white/60 border border-border/40'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        value={box.label || ''}
                        onChange={(e) => handleUpdateBoxLabel(box.id, e.target.value)}
                        placeholder={`Lösung für Maske #${idx + 1}`}
                        className="flex-1 bg-transparent border-b border-transparent focus:border-accent outline-none text-xs text-text-primary"
                        onClick={() => setSelectedBoxId(box.id)}
                      />
                      <button
                        onClick={() => handleDeleteBox(box.id)}
                        className="text-text-disabled hover:text-danger p-1 rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          <Button variant="secondary" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!imageSrc || boxes.length === 0}
          >
            <Check size={14} /> Karteikarte speichern ({boxes.length} {boxes.length === 1 ? 'Maske' : 'Masken'})
          </Button>
        </div>
      </div>
    </Modal>
  );
};
