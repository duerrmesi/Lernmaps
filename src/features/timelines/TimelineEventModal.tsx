import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, Textarea } from '../../components/Input';
import { TIMELINE_COLORS } from './timelineUtils';
import type { TimelineEvent, TimelineEventImportance } from '../../types';

interface TimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    date: string;
    endDate?: string;
    category?: string;
    color?: string;
    importance: TimelineEventImportance;
  }) => void;
  initialData?: TimelineEvent | null;
}

const PRESET_CATEGORIES = [
  'Allgemein',
  'Politik',
  'Wissenschaft',
  'Kultur',
  'Wirtschaft',
  'Konflikt & Krieg',
  'Entdeckung',
  'Recht & Gesetz',
  'Gesellschaft',
];

interface FormProps {
  initialData?: TimelineEvent | null;
  onSave: TimelineEventModalProps['onSave'];
  onClose: () => void;
}

const TimelineEventForm: React.FC<FormProps> = ({ initialData, onSave, onClose }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [date, setDate] = useState(initialData?.date || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(
    initialData?.category && PRESET_CATEGORIES.includes(initialData.category)
      ? initialData.category
      : initialData?.category
      ? 'custom'
      : 'Allgemein'
  );
  const [customCategory, setCustomCategory] = useState(
    initialData?.category && !PRESET_CATEGORIES.includes(initialData.category)
      ? initialData.category
      : ''
  );
  const [color, setColor] = useState(initialData?.color || 'blue');
  const [importance, setImportance] = useState<TimelineEventImportance>(
    initialData?.importance || 'medium'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;

    const finalCategory = category === 'custom' ? customCategory.trim() : category;

    onSave({
      title: title.trim(),
      description: description.trim(),
      date: date.trim(),
      endDate: endDate.trim() ? endDate.trim() : undefined,
      category: finalCategory || 'Allgemein',
      color,
      importance,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <Input
        label="Titel des Ereignisses *"
        placeholder="z.B. Sturm auf die Bastille oder Entdeckung Amerikas"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        required
      />

      {/* Date Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Datum / Startzeitpunkt *"
          placeholder="z.B. 14.07.1789, 1789 oder 44 v. Chr."
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Enddatum / Zeitraum bis (optional)"
          placeholder="z.B. 1799 oder 1945"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* Category & Importance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Kategorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-ui px-2.5 py-1.5 rounded border border-border bg-white text-text-primary focus:outline-none focus:border-border-strong"
          >
            {PRESET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="custom">Eigene Kategorie...</option>
          </select>
          {category === 'custom' && (
            <input
              type="text"
              placeholder="Eigene Kategorie eingeben"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="mt-1.5 w-full text-ui px-2.5 py-1.5 rounded border border-border bg-white text-text-primary focus:outline-none focus:border-border-strong"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Bedeutung / Wichtigkeit
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'low', label: 'Detail' },
                { id: 'medium', label: 'Wichtig' },
                { id: 'high', label: 'Schlüssel' },
              ] as const
            ).map((opt) => (
              <button
                type="button"
                key={opt.id}
                onClick={() => setImportance(opt.id)}
                className={`text-xs py-1.5 px-2 rounded border text-center transition-colors ${
                  importance === opt.id
                    ? 'bg-text-primary text-text-inverse border-text-primary font-medium'
                    : 'bg-white text-text-secondary border-border hover:bg-bg-secondary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">
          Farbliche Kennzeichnung
        </label>
        <div className="flex items-center gap-2">
          {Object.values(TIMELINE_COLORS).map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${c.dotColor} ${
                color === c.id
                  ? 'ring-2 ring-offset-2 ring-text-primary scale-110'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Description */}
      <Textarea
        label="Beschreibung & Notizen"
        placeholder="Hintergrund, Ursachen, Auswirkungen, Schlüsselpersonen..."
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" type="button" onClick={onClose}>
          Abbrechen
        </Button>
        <Button variant="primary" type="submit" disabled={!title.trim() || !date.trim()}>
          {initialData ? 'Änderungen speichern' : 'Ereignis erstellen'}
        </Button>
      </div>
    </form>
  );
};

export const TimelineEventModal: React.FC<TimelineEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Ereignis bearbeiten' : 'Neues Ereignis hinzufügen'}
      size="md"
    >
      <TimelineEventForm
        key={`${isOpen ? 'open' : 'closed'}-${initialData?.id || 'new'}`}
        initialData={initialData}
        onSave={onSave}
        onClose={onClose}
      />
    </Modal>
  );
};
