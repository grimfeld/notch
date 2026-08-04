import { useMemo } from "react";
import { dayKey } from "@/lib/aggregate";
import { colorVar } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DotGridProps {
  /** Local YYYY-MM-DD keys of marked days. */
  days: Set<string>;
  start: Date;
  end: Date;
  color: string; // color slot name
}

/**
 * GitHub-style dot grid for a Boolean stat: one column per week, one row per
 * weekday (Mon top), filled dot = marked day.
 */
export function DotGrid({ days, start, end, color }: DotGridProps) {
  const weeks = useMemo(() => {
    // Rewind to the Monday of the start week so columns align.
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7));
    const first = new Date(start);
    first.setHours(0, 0, 0, 0);
    const cols: { key: string; state: "marked" | "empty" | "pad" }[][] = [];
    while (cursor <= end) {
      const col: { key: string; state: "marked" | "empty" | "pad" }[] = [];
      for (let i = 0; i < 7; i++) {
        const key = dayKey(cursor.toISOString());
        col.push({
          key,
          state:
            cursor < first || cursor > end
              ? "pad"
              : days.has(key)
                ? "marked"
                : "empty",
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      cols.push(col);
    }
    return cols;
  }, [days, start, end]);

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max gap-1 py-1">
        {weeks.map((col) => (
          <div key={col[0].key} className="flex flex-col gap-1">
            {col.map((cell) => (
              <div
                key={cell.key}
                title={cell.state === "pad" ? undefined : cell.key}
                className={cn(
                  "size-3 rounded-[3px]",
                  cell.state === "pad" && "opacity-0",
                  cell.state === "empty" && "bg-muted",
                )}
                style={
                  cell.state === "marked"
                    ? { background: colorVar(color) }
                    : undefined
                }
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DotStripProps {
  days: Set<string>;
  /** How many trailing days to show, ending today. */
  count: number;
  color: string;
  now?: Date;
}

/** Single row of trailing days for dashboard cards, oldest left. */
export function DotStrip({ days, count, color, now = new Date() }: DotStripProps) {
  const cells = useMemo(() => {
    const out: { key: string; marked: boolean }[] = [];
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (count - 1));
    for (let i = 0; i < count; i++) {
      const key = dayKey(d.toISOString());
      out.push({ key, marked: days.has(key) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }, [days, count, now]);

  return (
    <div className="flex h-9 items-center gap-1">
      {cells.map((cell) => (
        <div
          key={cell.key}
          title={cell.key}
          className={cn("size-3 rounded-[3px]", !cell.marked && "bg-muted")}
          style={cell.marked ? { background: colorVar(color) } : undefined}
        />
      ))}
    </div>
  );
}
