import React from 'react';
import type { TimelineEvent } from '../../types';
import { getColorScheme, isSpanEvent } from './timelineUtils';
import { Calendar, Edit2, Trash2, Star, Tag, Clock } from 'lucide-react';

interface TimelineVerticalViewProps {
  events: TimelineEvent[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
}

export const TimelineVerticalView: React.FC<TimelineVerticalViewProps> = ({
  events,
  onEdit,
  onDelete,
}) => {
  if (events.length === 0) {
    return (
      <div className="py-20 text-center text-text-disabled text-sm">
        Keine Ereignisse für die gewählten Filter vorhanden.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-6">
      <div className="relative pl-6 md:pl-0">
        {/* Central Vertical Line for Desktop, Left-aligned for mobile */}
        <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-[2px] bg-border-strong -translate-x-1/2 z-0" />

        <div className="space-y-8 relative z-10">
          {events.map((event, index) => {
            const color = getColorScheme(event.color);
            const isEven = index % 2 === 0;
            const isHigh = event.importance === 'high';
            const isSpan = isSpanEvent(event);
            const isConcurrent = events.some(
              (other) =>
                other.id !== event.id &&
                other.date.trim().toLowerCase() === event.date.trim().toLowerCase()
            );

            return (
              <div
                key={event.id}
                className={`relative flex flex-col md:flex-row items-center ${
                  isEven ? 'md:flex-row-reverse' : ''
                } group`}
              >
                {/* Milestone Node on the line */}
                <div
                  className={`absolute left-6 md:left-1/2 top-5 -translate-x-1/2 w-6 h-6 rounded-full border-4 border-white ${
                    color.dotColor
                  } shadow-xs z-20 group-hover:scale-125 transition-transform ${
                    isHigh ? 'ring-2 ring-amber-400' : ''
                  }`}
                />

                {/* Event Card Content (Takes half width on md+) */}
                <div
                  className={`w-full md:w-[calc(50%-28px)] pl-12 md:pl-0 ${
                    isEven ? 'md:pl-0 md:pr-4 md:text-right' : 'md:pl-4 md:text-left'
                  }`}
                >
                  <div
                    className={`bg-white rounded-lg border ${
                      isSpan ? 'border-2 border-border-strong shadow-sm' : 'border border-border shadow-xs'
                    } hover:shadow-md transition-all p-4 border-l-4 ${
                      isEven ? 'md:border-l-1 md:border-r-4' : ''
                    } ${color.cardBorder} relative`}
                  >
                    {/* Header: Date + Tags */}
                    <div
                      className={`flex items-center gap-1.5 flex-wrap mb-2 ${
                        isEven ? 'md:justify-end' : 'justify-start'
                      }`}
                    >
                      {isSpan ? (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`}
                        >
                          <Clock size={11} />
                          {event.date} – {event.endDate} (Zeitspanne)
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`}
                        >
                          <Calendar size={11} />
                          {event.date}
                        </span>
                      )}

                      {event.category && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-bg-secondary text-text-secondary border border-border">
                          <Tag size={10} />
                          {event.category}
                        </span>
                      )}

                      {isHigh && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200"
                          title="Schlüsselereignis"
                        >
                          <Star size={10} fill="currentColor" />
                          Schlüsselereignis
                        </span>
                      )}

                      {isConcurrent && (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10.5px] font-medium px-2 py-0.5 rounded-md bg-accent-muted text-accent border border-accent/30"
                          title="Fand zeitgleich mit einem anderen Ereignis statt"
                        >
                          Zeitgleich
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[14px] font-semibold text-text-primary leading-snug mb-1">
                      {event.title}
                    </h3>

                    {/* Description */}
                    {event.description && (
                      <p className="text-[12.5px] text-text-secondary leading-relaxed whitespace-pre-line mb-3">
                        {event.description}
                      </p>
                    )}

                    {/* Action buttons */}
                    <div
                      className={`flex items-center gap-2 pt-2 border-t border-border/60 ${
                        isEven ? 'md:justify-end' : 'justify-start'
                      }`}
                    >
                      <button
                        onClick={() => onEdit(event)}
                        className="inline-flex items-center gap-1 text-[11.5px] text-text-secondary hover:text-text-primary px-2 py-1 rounded hover:bg-bg-secondary transition-colors"
                      >
                        <Edit2 size={11} />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => onDelete(event.id)}
                        className="inline-flex items-center gap-1 text-[11.5px] text-text-disabled hover:text-danger px-2 py-1 rounded hover:bg-danger-light transition-colors"
                      >
                        <Trash2 size={11} />
                        <span>Löschen</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
