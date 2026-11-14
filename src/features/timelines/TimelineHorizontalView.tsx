import React, { useRef, useMemo } from 'react';
import type { TimelineEvent } from '../../types';
import {
  getColorScheme,
  buildTimelineMilestonesAndSpans,
  getHorizontalCurlyBracePath,
  isSpanEvent,
} from './timelineUtils';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, Star, Clock } from 'lucide-react';

interface TimelineHorizontalViewProps {
  events: TimelineEvent[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
}

const COLUMN_WIDTH = 260;
const COLUMN_GAP = 60;
const STEP = COLUMN_WIDTH + COLUMN_GAP; // 320px
const PADDING_LEFT = 60;

/**
 * Standard card for single milestone point events
 */
const TimelineCard: React.FC<{
  event: TimelineEvent;
  position: 'above' | 'below';
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
}> = ({ event, onEdit, onDelete }) => {
  const color = getColorScheme(event.color);
  const isHigh = event.importance === 'high';

  return (
    <div
      className={`w-full bg-white rounded-lg border border-border shadow-xs hover:shadow-md transition-all p-3 border-t-4 ${color.cardBorder.replace(
        'border-l-',
        'border-t-'
      )} relative animate-fade-in`}
    >
      {/* Header: Date + Badges */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`}
        >
          <Calendar size={10} />
          {event.date}
        </span>
        {isHigh && (
          <span className="text-amber-500 flex items-center" title="Schlüsselereignis">
            <Star size={12} fill="currentColor" />
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[13px] font-medium text-text-primary leading-tight line-clamp-2 mb-1">
        {event.title}
      </h4>

      {/* Category */}
      {event.category && (
        <div className="text-[10px] text-text-disabled uppercase font-medium tracking-wider mb-1.5">
          {event.category}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p className="text-[11.5px] text-text-secondary line-clamp-3 leading-relaxed mb-2">
          {event.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-border/60">
        <button
          onClick={() => onEdit(event)}
          className="p-1 text-text-disabled hover:text-text-primary hover:bg-bg-secondary rounded transition-colors"
          title="Bearbeiten"
        >
          <Edit2 size={11} />
        </button>
        <button
          onClick={() => onDelete(event.id)}
          className="p-1 text-text-disabled hover:text-danger hover:bg-danger-light rounded transition-colors"
          title="Löschen"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

/**
 * Period Banner Card sitting in the center above the curly brace
 */
const TimelineSpanCard: React.FC<{
  event: TimelineEvent;
  onEdit: (event: TimelineEvent) => void;
  onDelete: (id: string) => void;
}> = ({ event, onEdit, onDelete }) => {
  const color = getColorScheme(event.color);
  const isHigh = event.importance === 'high';

  return (
    <div
      className={`w-full max-w-[340px] bg-white rounded-lg border-2 border-border shadow-sm hover:shadow-md transition-all p-3 border-t-4 ${color.cardBorder.replace(
        'border-l-',
        'border-t-'
      )} relative animate-fade-in`}
    >
      {/* Header: Timespan + Badges */}
      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${color.badgeBg} ${color.badgeText} ${color.badgeBorder}`}
        >
          <Clock size={11} />
          {event.date} – {event.endDate}
        </span>
        {isHigh && (
          <span className="text-amber-500 flex items-center" title="Schlüssel-Epoche">
            <Star size={12} fill="currentColor" />
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[14px] font-bold text-text-primary leading-tight line-clamp-2 mb-1">
        {event.title}
      </h3>

      {/* Category */}
      {event.category && (
        <div className="text-[10px] text-text-disabled uppercase font-semibold tracking-wider mb-1.5">
          {event.category}
        </div>
      )}

      {/* Description */}
      {event.description && (
        <p className="text-[11.5px] text-text-secondary line-clamp-2 leading-relaxed mb-2">
          {event.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-border/60">
        <button
          onClick={() => onEdit(event)}
          className="p-1 text-text-disabled hover:text-text-primary hover:bg-bg-secondary rounded transition-colors"
          title="Bearbeiten"
        >
          <Edit2 size={11} />
        </button>
        <button
          onClick={() => onDelete(event.id)}
          className="p-1 text-text-disabled hover:text-danger hover:bg-danger-light rounded transition-colors"
          title="Löschen"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
};

export const TimelineHorizontalView: React.FC<TimelineHorizontalViewProps> = ({
  events,
  onEdit,
  onDelete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const offset = direction === 'left' ? -380 : 380;
    containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const { milestones, placedSpans, maxLane } = useMemo(
    () => buildTimelineMilestonesAndSpans(events),
    [events]
  );

  const totalSpansCount = useMemo(() => events.filter(isSpanEvent).length, [events]);

  // Pre-calculate alternating placement for point events
  const milestoneData = useMemo(() => {
    return milestones.map((m, mIndex) => {
      let above: TimelineEvent[] = [];
      let below: TimelineEvent[] = [];

      if (m.pointEvents.length === 1) {
        if (mIndex % 2 === 0) {
          above = [m.pointEvents[0]];
        } else {
          below = [m.pointEvents[0]];
        }
      } else if (m.pointEvents.length === 2) {
        above = [m.pointEvents[0]];
        below = [m.pointEvents[1]];
      } else if (m.pointEvents.length > 2) {
        above = m.pointEvents.filter((_, i) => i % 2 === 0);
        below = m.pointEvents.filter((_, i) => i % 2 === 1);
      }

      return { milestone: m, above, below };
    });
  }, [milestones]);

  if (events.length === 0 || milestones.length === 0) {
    return (
      <div className="py-20 text-center text-text-disabled text-sm">
        Keine Ereignisse für die gewählten Filter vorhanden.
      </div>
    );
  }

  // Calculate center X coordinate for milestone i
  const getCenterX = (index: number) => PADDING_LEFT + index * STEP + COLUMN_WIDTH / 2;

  const totalWidth = PADDING_LEFT * 2 + milestones.length * STEP;
  const spanTiersHeight = placedSpans.length > 0 ? (maxLane + 1) * 170 : 0;

  return (
    <div className="relative w-full bg-white border border-border rounded-lg shadow-sm p-4 overflow-hidden">
      {/* Scroll controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-30">
        <button
          onClick={() => scroll('left')}
          className="p-1.5 rounded border border-border bg-white hover:bg-bg-secondary text-text-secondary transition-colors shadow-xs"
          title="Nach links scrollen"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => scroll('right')}
          className="p-1.5 rounded border border-border bg-white hover:bg-bg-secondary text-text-secondary transition-colors shadow-xs"
          title="Nach rechts scrollen"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="text-[11px] font-medium text-text-disabled uppercase tracking-wider mb-2">
        Horizontale Ansicht ({events.length} Ereignisse, {totalSpansCount} Zeitspannen mit Klammern)
      </div>

      {/* Horizontal scroll track */}
      <div
        ref={containerRef}
        className="overflow-x-auto scrollbar-thin py-6 px-4 min-h-[500px]"
      >
        <div
          className="relative min-w-max pb-20 pt-8"
          style={{ width: Math.max(totalWidth, 800) }}
        >
          {/* ══════════════════════════════════════════════════════════════
              1. SPAN BRACKETS TIER (Große Klammern für Zeitspannen)
             ══════════════════════════════════════════════════════════════ */}
          {placedSpans.length > 0 && (
            <div
              className="relative w-full mb-8"
              style={{ height: spanTiersHeight }}
            >
              {placedSpans.map((placed) => {
                const startX = getCenterX(placed.startIndex);
                const endX = getCenterX(placed.endIndex);
                const isSingleMilestone = placed.startIndex === placed.endIndex;

                const leftX = isSingleMilestone ? startX - COLUMN_WIDTH / 2 : startX;
                const rightX = isSingleMilestone ? startX + COLUMN_WIDTH / 2 : endX;
                const spanWidth = Math.max(160, rightX - leftX);

                const color = getColorScheme(placed.event.color);
                const laneTop = placed.lane * 170;
                const braceHeight = 24;

                const bracePath = getHorizontalCurlyBracePath(spanWidth, braceHeight, 'up');

                return (
                  <div
                    key={placed.event.id}
                    className="absolute flex flex-col items-center z-20 group"
                    style={{
                      left: leftX,
                      width: spanWidth,
                      top: laneTop,
                    }}
                  >
                    {/* Period Banner Card */}
                    <div className="w-full flex justify-center mb-1">
                      <TimelineSpanCard
                        event={placed.event}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </div>

                    {/* Große Klammer (SVG Curly Brace) */}
                    <div className="relative w-full flex items-center justify-center">
                      <svg
                        width={spanWidth}
                        height={braceHeight}
                        className="overflow-visible"
                        style={{ color: color.dotColor.replace('bg-', '') }}
                      >
                        {/* Curly brace line */}
                        <path
                          d={bracePath}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                        />
                        {/* Left bracket pin */}
                        <circle cx={0} cy={braceHeight} r={4} fill="currentColor" />
                        {/* Right bracket pin */}
                        <circle cx={spanWidth} cy={braceHeight} r={4} fill="currentColor" />
                      </svg>
                    </div>

                    {/* Guide drop-lines from bracket tips down toward the axis */}
                    <div
                      className="absolute left-0 w-[2px] bg-border-strong opacity-40 -z-10"
                      style={{
                        top: 130 + braceHeight,
                        height: spanTiersHeight - laneTop + 10,
                      }}
                    />
                    <div
                      className="absolute right-0 w-[2px] bg-border-strong opacity-40 -z-10"
                      style={{
                        top: 130 + braceHeight,
                        height: spanTiersHeight - laneTop + 10,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              2. CENTRAL AXIS LINE & SPAN HIGHLIGHT BARS
             ══════════════════════════════════════════════════════════════ */}
          <div className="relative w-full py-4">
            {/* Base Axis Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-border-strong rounded-full z-0" />

            {/* Glowing colored span bars along the axis for each span event */}
            {placedSpans.map((placed) => {
              const startX = getCenterX(placed.startIndex);
              const endX = getCenterX(placed.endIndex);
              const isSingleMilestone = placed.startIndex === placed.endIndex;
              const leftX = isSingleMilestone ? startX - COLUMN_WIDTH / 2 : startX;
              const rightX = isSingleMilestone ? startX + COLUMN_WIDTH / 2 : endX;
              const width = Math.max(160, rightX - leftX);
              const color = getColorScheme(placed.event.color);

              return (
                <div
                  key={`bar-${placed.event.id}`}
                  className={`absolute top-1/2 -translate-y-1/2 h-[7px] rounded-full z-5 ${color.barColor} opacity-75 shadow-xs`}
                  style={{
                    left: leftX,
                    width,
                  }}
                  title={`${placed.event.title} (${placed.event.date} – ${placed.event.endDate})`}
                />
              );
            })}

            {/* ══════════════════════════════════════════════════════════
                3. MILESTONE COLUMNS & POINT EVENT CARDS
               ══════════════════════════════════════════════════════════ */}
            <div
              className="relative z-10 flex items-center"
              style={{ paddingLeft: PADDING_LEFT }}
            >
              {milestoneData.map(({ milestone, above, below }) => {
                const hasBoth = above.length > 0 && below.length > 0;
                const isOnlyAbove = above.length > 0 && below.length === 0;
                const hasHighImportance = milestone.pointEvents.some(
                  (e) => e.importance === 'high'
                );

                const primaryColor = getColorScheme(
                  above[0]?.color || below[0]?.color || 'blue'
                );

                return (
                  <div
                    key={milestone.key}
                    className="relative flex flex-col items-center group shrink-0"
                    style={{
                      width: COLUMN_WIDTH,
                      marginRight: COLUMN_GAP,
                    }}
                  >
                    {/* TOP SECTION: Point cards above axis */}
                    <div className="w-full flex flex-col items-center justify-end min-h-[200px]">
                      {above.length > 0 ? (
                        <div className="w-full flex flex-col items-center gap-2">
                          {above.map((ev) => (
                            <TimelineCard
                              key={ev.id}
                              event={ev}
                              position="above"
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          ))}
                          {/* Connector down to axis */}
                          <div className="w-[2px] h-6 bg-border-strong shrink-0" />
                        </div>
                      ) : (
                        // Spacer to keep axis vertically aligned
                        <div className="h-[160px]" />
                      )}
                    </div>

                    {/* AXIS MILESTONE NODE */}
                    <div className="relative my-0 flex items-center justify-center shrink-0">
                      <div
                        className={`w-6 h-6 rounded-full border-4 border-white ${
                          hasBoth ? 'bg-accent' : primaryColor.dotColor
                        } shadow-sm z-20 transition-transform group-hover:scale-125 ${
                          hasHighImportance ? 'ring-2 ring-amber-400' : ''
                        }`}
                      />

                      {/* Date label pinned at the milestone node */}
                      <div
                        className={`absolute whitespace-nowrap text-[10.5px] font-bold z-30 shadow-2xs rounded px-1.5 py-0.5 border transition-all ${
                          hasBoth
                            ? 'left-[calc(50%+16px)] bg-accent-muted text-accent border-accent/30'
                            : isOnlyAbove
                            ? 'top-7 left-1/2 -translate-x-1/2 bg-white/95 text-text-secondary border-border/80'
                            : 'bottom-7 left-1/2 -translate-x-1/2 bg-white/95 text-text-secondary border-border/80'
                        }`}
                      >
                        {milestone.dateDisplay}
                        {hasBoth && (
                          <span
                            className="ml-1 text-[9px] font-semibold bg-accent text-white px-1 py-0.2 rounded-full"
                            title={`${milestone.pointEvents.length} Ereignisse zur gleichen Zeit`}
                          >
                            {milestone.pointEvents.length}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BOTTOM SECTION: Point cards below axis */}
                    <div className="w-full flex flex-col items-center justify-start min-h-[200px]">
                      {below.length > 0 ? (
                        <div className="w-full flex flex-col items-center gap-2">
                          {/* Connector up from axis */}
                          <div className="w-[2px] h-6 bg-border-strong shrink-0" />
                          {below.map((ev) => (
                            <TimelineCard
                              key={ev.id}
                              event={ev}
                              position="below"
                              onEdit={onEdit}
                              onDelete={onDelete}
                            />
                          ))}
                        </div>
                      ) : (
                        // Spacer to keep axis vertically aligned
                        <div className="h-[160px]" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
