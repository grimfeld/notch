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

export function formatValue(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
