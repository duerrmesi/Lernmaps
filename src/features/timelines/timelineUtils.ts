import type { TimelineEvent } from '../../types';

const MONTH_MAP: Record<string, number> = {
  jan: 1, januar: 1, january: 1,
  feb: 2, februar: 2, february: 2,
  mär: 3, maerz: 3, märz: 3, mar: 3, march: 3,
  apr: 4, april: 4,
  mai: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10,
  nov: 11, november: 11,
  dez: 12, dezember: 12, dec: 12, december: 12,
};

/**
 * Parses any common timeline date string (e.g. "1789", "14.07.1789", "14. Juli 1789", "44 v. Chr.", "1989-11-09")
 * into a single comparable floating point number representing year + fractional year.
 */
export function parseTimelineDateToNumber(dateStr?: string): number {
  if (!dateStr || !dateStr.trim()) return 0;
  const raw = dateStr.trim().toLowerCase();

  // Check for BC / v. Chr.
  const isBC = raw.includes('v. chr') || raw.includes('v.chr') || raw.includes('bc') || raw.includes('b.c.');

  // Clean prefixes like ca., um, etwa, circa, vor, im jahr, etc.
  let cleaned = raw
    .replace(/(ca\.|circa|um|etwa|im jahr|jahr|vor)\s*/gi, '')
    .replace(/(v\.\s*chr\.?|bc|b\.c\.)/gi, '')
    .trim();

  // Try ISO YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const val = y + (m - 1) / 12 + (d - 1) / 365;
    return isBC ? -val : val;
  }

  // Try German DD.MM.YYYY
  const deMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{1,4})$/);
  if (deMatch) {
    const d = parseInt(deMatch[1], 10);
    const m = parseInt(deMatch[2], 10);
    const y = parseInt(deMatch[3], 10);
    const val = y + (m - 1) / 12 + (d - 1) / 365;
    return isBC ? -val : val;
  }

  // Try Named month: "14. Juli 1789" or "Juli 1789"
  const textMonthMatch = cleaned.match(/^(\d{1,2})?\.?\s*([a-zäöü]+)\.?\s*(\d{1,5})$/);
  if (textMonthMatch) {
    const d = textMonthMatch[1] ? parseInt(textMonthMatch[1], 10) : 1;
    const mName = textMonthMatch[2];
    const y = parseInt(textMonthMatch[3], 10);
    const m = MONTH_MAP[mName] || 1;
    const val = y + (m - 1) / 12 + (d - 1) / 365;
    return isBC ? -val : val;
  }

  // Try just year: "1789", "800", "-44"
  const yearMatch = cleaned.match(/^(-?\d{1,6})/);
  if (yearMatch) {
    let y = parseInt(yearMatch[1], 10);
    if (isBC && y > 0) y = -y;
    return y;
  }

  return 0;
}

export function sortTimelineEvents(events: TimelineEvent[], ascending = true): TimelineEvent[] {
  return [...events].sort((a, b) => {
    const numA = parseTimelineDateToNumber(a.date);
    const numB = parseTimelineDateToNumber(b.date);
    if (numA !== numB) {
      return ascending ? numA - numB : numB - numA;
    }
    return ascending
      ? a.title.localeCompare(b.title)
      : b.title.localeCompare(a.title);
  });
}

export interface ColorScheme {
  id: string;
  name: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  barColor: string;
  cardBorder: string;
}

export const TIMELINE_COLORS: Record<string, ColorScheme> = {
  blue: {
    id: 'blue',
    name: 'Blau',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    dotColor: 'bg-blue-600',
    barColor: 'bg-blue-500',
    cardBorder: 'border-l-blue-600',
  },
  emerald: {
    id: 'emerald',
    name: 'Grün',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
    barColor: 'bg-emerald-500',
    cardBorder: 'border-l-emerald-600',
  },
  amber: {
    id: 'amber',
    name: 'Bernstein',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-600',
    barColor: 'bg-amber-500',
    cardBorder: 'border-l-amber-600',
  },
  rose: {
    id: 'rose',
    name: 'Rot',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    dotColor: 'bg-rose-600',
    barColor: 'bg-rose-500',
    cardBorder: 'border-l-rose-600',
  },
  purple: {
    id: 'purple',
    name: 'Lila',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-600',
    barColor: 'bg-purple-500',
    cardBorder: 'border-l-purple-600',
  },
  indigo: {
    id: 'indigo',
    name: 'Indigo',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-600',
    barColor: 'bg-indigo-500',
    cardBorder: 'border-l-indigo-600',
  },
};

export function getColorScheme(color?: string): ColorScheme {
  if (color && TIMELINE_COLORS[color]) {
    return TIMELINE_COLORS[color];
  }
  return TIMELINE_COLORS.blue;
}

export interface TimelineEventGroup {
  timeKey: string;
  dateDisplay: string;
  dateNumber: number;
  events: TimelineEvent[];
}

export function groupTimelineEventsByDate(
  events: TimelineEvent[],
  ascending = true
): TimelineEventGroup[] {
  const sorted = sortTimelineEvents(events, ascending);
  const groups: TimelineEventGroup[] = [];

  for (const event of sorted) {
    const num = parseTimelineDateToNumber(event.date);
    const cleanDate = event.date.trim().toLowerCase();

    const lastGroup = groups[groups.length - 1];
    const isSameDate =
      lastGroup &&
      (cleanDate === lastGroup.dateDisplay.trim().toLowerCase() ||
        Math.abs(lastGroup.dateNumber - num) < 0.0001);

    if (isSameDate) {
      lastGroup.events.push(event);
    } else {
      groups.push({
        timeKey: `${num}_${cleanDate}_${event.id}`,
        dateDisplay: event.date,
        dateNumber: num,
        events: [event],
      });
    }
  }

  return groups;
}

export function isSpanEvent(event: TimelineEvent): boolean {
  return !!(
    event.endDate &&
    event.endDate.trim() !== '' &&
    event.endDate.trim().toLowerCase() !== event.date.trim().toLowerCase()
  );
}

export function getHorizontalCurlyBracePath(
  width: number,
  height: number,
  direction: 'up' | 'down' = 'up'
): string {
  const r = Math.min(14, Math.max(4, width / 10));
  const midX = width / 2;

  if (direction === 'up') {
    // Legs point down at y = height, tip/cusp points UP at y = 0
    const armY = height - r;
    return `M 0 ${height} Q 0 ${armY} ${r} ${armY} L ${midX - r} ${armY} Q ${midX} ${armY} ${midX} 0 Q ${midX} ${armY} ${midX + r} ${armY} L ${width - r} ${armY} Q ${width} ${armY} ${width} ${height}`;
  } else {
    // Legs point UP at y = 0, tip/cusp points DOWN at y = height
    const armY = r;
    return `M 0 0 Q 0 ${armY} ${r} ${armY} L ${midX - r} ${armY} Q ${midX} ${armY} ${midX} ${height} Q ${midX} ${armY} ${midX + r} ${armY} L ${width - r} ${armY} Q ${width} ${armY} ${width} 0`;
  }
}

export interface TimelineMilestone {
  key: string;
  dateDisplay: string;
  dateNumber: number;
  pointEvents: TimelineEvent[];
}

export interface PlacedSpanEvent {
  event: TimelineEvent;
  startIndex: number;
  endIndex: number;
  startNum: number;
  endNum: number;
  lane: number;
}

export function buildTimelineMilestonesAndSpans(
  events: TimelineEvent[],
  ascending = true
): {
  milestones: TimelineMilestone[];
  placedSpans: PlacedSpanEvent[];
  maxLane: number;
} {
  const pointEvents = events.filter((e) => !isSpanEvent(e));
  const spanEvents = events.filter((e) => isSpanEvent(e));

  // Collect all unique date points across point events and span starts/ends
  const dateMap = new Map<
    string,
    { display: string; num: number; pointEvents: TimelineEvent[] }
  >();

  for (const pe of pointEvents) {
    const num = parseTimelineDateToNumber(pe.date);
    const key = `${num.toFixed(4)}_${pe.date.trim().toLowerCase()}`;
    if (!dateMap.has(key)) {
      dateMap.set(key, { display: pe.date, num, pointEvents: [] });
    }
    dateMap.get(key)!.pointEvents.push(pe);
  }

  for (const se of spanEvents) {
    // Start date
    const startNum = parseTimelineDateToNumber(se.date);
    const startKey = `${startNum.toFixed(4)}_${se.date.trim().toLowerCase()}`;
    if (!dateMap.has(startKey)) {
      dateMap.set(startKey, { display: se.date, num: startNum, pointEvents: [] });
    }

    // End date
    if (se.endDate) {
      const endNum = parseTimelineDateToNumber(se.endDate);
      const endKey = `${endNum.toFixed(4)}_${se.endDate.trim().toLowerCase()}`;
      if (!dateMap.has(endKey)) {
        dateMap.set(endKey, { display: se.endDate, num: endNum, pointEvents: [] });
      }
    }
  }

  // Sort milestones chronologically
  const milestones: TimelineMilestone[] = Array.from(dateMap.entries())
    .map(([key, data]) => ({
      key,
      dateDisplay: data.display,
      dateNumber: data.num,
      pointEvents: data.pointEvents,
    }))
    .sort((a, b) => (ascending ? a.dateNumber - b.dateNumber : b.dateNumber - a.dateNumber));

  if (milestones.length === 0) {
    return { milestones: [], placedSpans: [], maxLane: 0 };
  }

  // Find index in milestones for a given date
  const findMilestoneIndex = (dateStr: string, numVal: number): number => {
    const clean = dateStr.trim().toLowerCase();
    const idx = milestones.findIndex(
      (m) =>
        m.dateDisplay.trim().toLowerCase() === clean ||
        Math.abs(m.dateNumber - numVal) < 0.0001
    );
    return idx !== -1 ? idx : 0;
  };

  // Map each span event to milestone indices
  const rawSpans = spanEvents.map((event) => {
    const startNum = parseTimelineDateToNumber(event.date);
    const endNum = parseTimelineDateToNumber(event.endDate);
    const idxA = findMilestoneIndex(event.date, startNum);
    const idxB = findMilestoneIndex(event.endDate || event.date, endNum);

    const startIndex = Math.min(idxA, idxB);
    const endIndex = Math.max(idxA, idxB);

    return {
      event,
      startIndex,
      endIndex,
      startNum: Math.min(startNum, endNum),
      endNum: Math.max(startNum, endNum),
    };
  });

  // Sort spans by start index, then longer spans first
  rawSpans.sort((a, b) => {
    if (a.startIndex !== b.startIndex) {
      return a.startIndex - b.startIndex;
    }
    return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
  });

  // Assign lanes to prevent overlapping
  const laneEndIndices: number[] = [];
  let maxLane = 0;

  const placedSpans: PlacedSpanEvent[] = rawSpans.map((span) => {
    let lane = 0;
    while (laneEndIndices[lane] !== undefined && laneEndIndices[lane] > span.startIndex) {
      lane++;
    }
    laneEndIndices[lane] = span.endIndex;
    if (lane > maxLane) maxLane = lane;
    return {
      ...span,
      lane,
    };
  });

  return { milestones, placedSpans, maxLane };
}
