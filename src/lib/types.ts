export const STAT_KINDS = [
  "additive",
  "measurement",
  "boolean",
  "collection",
] as const;
export type StatKind = (typeof STAT_KINDS)[number];

export const COLOR_SLOTS = [
  "blue",
  "orange",
  "aqua",
  "yellow",
  "magenta",
  "green",
  "violet",
  "red",
] as const;
export type ColorSlot = (typeof COLOR_SLOTS)[number];

export function colorVar(slot: string): string {
  return `var(--chart-${slot})`;
}

export interface Stat {
  id: string;
  name: string;
  kind: StatKind;
  unit: string;
  color: ColorSlot;
  defaultIncrement: number;
  /** Collection only: size of the item universe (195 countries) — a fact shown as denominator, not a goal. */
  universeSize: number;
  created: string;
  updated: string;
}

export interface Entry {
  id: string;
  stat: string;
  value: number;
  /** Collection only: name of the item collected ("France"). */
  item: string;
  /** Moment the event happened (user-settable), not the record creation time. */
  ts: string;
  created: string;
}

export type Period = "week" | "month" | "year" | "all";
