import type { Entry, Period, Stat } from "./types";
import type { QueuedEntry } from "./queue";

/** Local-timezone YYYY-MM-DD key for an ISO timestamp. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function periodStart(period: Period, now = new Date()): Date | null {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case "week":
      d.setDate(d.getDate() - 6);
      return d;
    case "month":
      d.setDate(d.getDate() - 29);
      return d;
    case "year":
      return new Date(d.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export function inPeriod(iso: string, period: Period, now = new Date()): boolean {
  const start = periodStart(period, now);
  return start === null || new Date(iso) >= start;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD
  label: string; // short display label
  sum: number;
  cumulative: number;
}

/**
 * Bucket additive entries into per-day sums over the period, gaps filled
 * with zero, plus a running cumulative.
 */
export function dailySeries(
  entries: Entry[],
  period: Period,
  now = new Date(),
): DayPoint[] {
  const inRange = entries.filter((e) => inPeriod(e.ts, period, now));
  const sums = new Map<string, number>();
  for (const e of inRange) {
    const k = dayKey(e.ts);
    sums.set(k, (sums.get(k) ?? 0) + e.value);
  }
  let start = periodStart(period, now);
  if (start === null) {
    if (inRange.length === 0) return [];
    const earliest = inRange.reduce((a, b) => (a.ts < b.ts ? a : b));
    start = new Date(earliest.ts);
    start.setHours(0, 0, 0, 0);
  }
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const points: DayPoint[] = [];
  let cumulative = 0;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d.toISOString());
    const sum = sums.get(k) ?? 0;
    cumulative += sum;
    points.push({
      day: k,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sum,
      cumulative,
    });
  }
  return points;
}

export interface ReadingPoint {
  ts: number; // epoch ms, for a time x-axis
  label: string;
  value: number;
}

/** Measurement entries as a chronological series of readings. */
export function readingSeries(
  entries: Entry[],
  period: Period,
  now = new Date(),
): ReadingPoint[] {
  return entries
    .filter((e) => inPeriod(e.ts, period, now))
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .map((e) => ({
      ts: new Date(e.ts).getTime(),
      label: new Date(e.ts).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: e.value,
    }));
}

/**
 * Headline number for a stat card. Additive: sum over the period, including
 * still-queued offline entries. Measurement: latest reading (queued included).
 */
export function headline(
  stat: Stat,
  entries: Entry[],
  pending: QueuedEntry[],
  period: Period,
  now = new Date(),
): number | null {
  const mine = pending.filter((q) => q.stat === stat.id);
  if (stat.kind === "additive") {
    const server = entries
      .filter((e) => inPeriod(e.ts, period, now))
      .reduce((acc, e) => acc + e.value, 0);
    const queued = mine
      .filter((q) => inPeriod(q.ts, period, now))
      .reduce((acc, q) => acc + q.value, 0);
    return server + queued;
  }
  const all = [
    ...entries.map((e) => ({ ts: e.ts, value: e.value })),
    ...mine.map((q) => ({ ts: q.ts, value: q.value })),
  ].sort((a, b) => b.ts.localeCompare(a.ts));
  return all.length > 0 ? all[0].value : null;
}

/** Merge server + queued entries for one stat into bare (ts, item) facts. */
export function mergedFacts(
  stat: Stat,
  entries: Entry[],
  pending: QueuedEntry[],
): { ts: string; item?: string }[] {
  return [
    ...entries.map((e) => ({ ts: e.ts, item: e.item })),
    ...pending.filter((q) => q.stat === stat.id).map((q) => ({ ts: q.ts, item: q.item })),
  ];
}

// --- Boolean ---------------------------------------------------------------

/** Distinct local days with ≥1 entry — duplicates collapse here (ADR-0002). */
export function markedDays(facts: { ts: string }[]): Set<string> {
  return new Set(facts.map((f) => dayKey(f.ts)));
}

/**
 * Boolean headline: days marked in the period, with a fixed denominator for
 * bounded windows (7 / 30) and none for growing ones (year, all).
 */
export function booleanHeadline(
  days: Set<string>,
  period: Period,
  now = new Date(),
): { count: number; denominator: number | null } {
  const start = periodStart(period, now);
  const count =
    start === null
      ? days.size
      : [...days].filter((d) => d >= dayKey(start.toISOString())).length;
  const denominator = period === "week" ? 7 : period === "month" ? 30 : null;
  return { count, denominator };
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dayKey(date.toISOString());
}

/**
 * Consecutive marked days ending today or yesterday — an unmarked today
 * doesn't break the run (the day isn't over).
 */
export function currentStreak(days: Set<string>, now = new Date()): number {
  const today = dayKey(now.toISOString());
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let run = 0;
  while (days.has(cursor)) {
    run++;
    cursor = shiftDay(cursor, -1);
  }
  return run;
}

/** Best run of consecutive marked days ever. */
export function longestStreak(days: Set<string>): number {
  let best = 0;
  for (const day of days) {
    if (days.has(shiftDay(day, -1))) continue; // not a run start
    let run = 1;
    let cursor = shiftDay(day, 1);
    while (days.has(cursor)) {
      run++;
      cursor = shiftDay(cursor, 1);
    }
    best = Math.max(best, run);
  }
  return best;
}

// --- Collection ------------------------------------------------------------

/** Dedupe key for a Collection item name. */
export function normalizeItem(name: string): string {
  return name.trim().toLowerCase();
}

export interface CollectedItem {
  /** First-logged spelling. */
  name: string;
  /** When it was first collected (ISO). */
  firstTs: string;
}

/**
 * Distinct collected items, deduped by normalized name (ADR-0002), keeping
 * the first-logged spelling and timestamp. Chronological by first collection.
 */
export function collectedItems(
  facts: { ts: string; item?: string }[],
): CollectedItem[] {
  const byKey = new Map<string, CollectedItem>();
  const sorted = [...facts]
    .filter((f) => f.item && f.item.trim() !== "")
    .sort((a, b) => a.ts.localeCompare(b.ts));
  for (const f of sorted) {
    const key = normalizeItem(f.item!);
    if (!byKey.has(key)) byKey.set(key, { name: f.item!.trim(), firstTs: f.ts });
  }
  return [...byKey.values()];
}

/** All-time cumulative distinct-item count, one step per new item. */
export function collectionSeries(items: CollectedItem[]): ReadingPoint[] {
  return items.map((it, i) => ({
    ts: new Date(it.firstTs).getTime(),
    label: new Date(it.firstTs).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    value: i + 1,
  }));
}

export function formatValue(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
