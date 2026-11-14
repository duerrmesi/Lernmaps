import React, { useState } from 'react';
import type { TimelineEvent } from '../../types';
import { getColorScheme, parseTimelineDateToNumber } from './timelineUtils';
import { Calendar, Edit2, Trash2, ArrowUpDown, Star, Tag } from 'lucide-react';

interface TimelineTableViewProps {
  events: TimelineEvent[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
}

type SortField = 'date' | 'title' | 'category' | 'importance';

export const TimelineTableView: React.FC<TimelineTableViewProps> = ({
  events,
  onEdit,
  onDelete,
}) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let diff = 0;
    if (sortField === 'date') {
      diff = parseTimelineDateToNumber(a.date) - parseTimelineDateToNumber(b.date);
    } else if (sortField === 'title') {
      diff = a.title.localeCompare(b.title);
    } else if (sortField === 'category') {
      diff = (a.category || '').localeCompare(b.category || '');
    } else if (sortField === 'importance') {
      const impWeight = { high: 3, medium: 2, low: 1 };
      diff = (impWeight[a.importance || 'medium'] || 2) - (impWeight[b.importance || 'medium'] || 2);
    }
    return sortAsc ? diff : -diff;
  });

  if (events.length === 0) {
    return (
      <div className="py-20 text-center text-text-disabled text-sm">
        Keine Ereignisse für die gewählten Filter vorhanden.
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-border rounded-lg shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-secondary border-b border-border text-[11px] font-semibold text-text-secondary uppercase tracking-wider select-none">
              <th className="py-2.5 px-4 w-[160px]">
                <button
                  onClick={() => handleSort('date')}
                  className="flex items-center gap-1 hover:text-text-primary transition-colors"
                >
                  <span>Datum / Zeitraum</span>
                  <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="py-2.5 px-4 min-w-[200px]">
                <button
                  onClick={() => handleSort('title')}
                  className="flex items-center gap-1 hover:text-text-primary transition-colors"
                >
                  <span>Ereignis</span>
                  <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="py-2.5 px-4 w-[130px]">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-1 hover:text-text-primary transition-colors"
                >
                  <span>Kategorie</span>
                  <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="py-2.5 px-4 w-[110px]">
                <button
                  onClick={() => handleSort('importance')}
                  className="flex items-center gap-1 hover:text-text-primary transition-colors"
                >
                  <span>Bedeutung</span>
                  <ArrowUpDown size={11} />
                </button>
              </th>
              <th className="py-2.5 px-4 text-right w-[90px]">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-[12.5px]">
            {sortedEvents.map((event) => {
              const color = getColorScheme(event.color);
              const isHigh = event.importance === 'high';

              return (
                <tr key={event.id} className="hover:bg-bg-secondary/60 transition-colors group">
                  {/* Date */}
                  <td className="py-3 px-4 font-mono font-medium text-text-primary">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`}
                    >
                      <Calendar size={10} />
                      {event.date}
                      {event.endDate && ` – ${event.endDate}`}
                    </span>
                  </td>

                  {/* Title & Description preview */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-text-primary">{event.title}</div>
                    {event.description && (
                      <div className="text-[11.5px] text-text-secondary line-clamp-1 mt-0.5">
                        {event.description}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 text-text-secondary text-[11.5px]">
                    {event.category ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-secondary border border-border">
                        <Tag size={10} />
                        {event.category}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Importance */}
                  <td className="py-3 px-4">
                    {isHigh ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Star size={10} fill="currentColor" />
                        Schlüssel
                      </span>
                    ) : event.importance === 'low' ? (
                      <span className="text-[11px] text-text-disabled">Detail</span>
                    ) : (
                      <span className="text-[11px] text-text-secondary">Wichtig</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(event)}
                        className="p-1 text-text-disabled hover:text-text-primary hover:bg-bg-tertiary rounded transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(event.id)}
                        className="p-1 text-text-disabled hover:text-danger hover:bg-danger-light rounded transition-colors"
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
