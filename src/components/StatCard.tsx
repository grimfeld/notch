import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Check, Flame, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/Sparkline";
import { DotStrip } from "@/components/DotGrid";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import {
  booleanHeadline,
  collectedItems,
  collectionSeries,
  currentStreak,
  dailySeries,
  dayKey,
  formatValue,
  headline,
  markedDays,
  mergedFacts,
  readingSeries,
} from "@/lib/aggregate";
import { useAddEntry, usePendingEntries } from "@/lib/hooks";
import { colorVar, type Entry, type Stat } from "@/lib/types";

interface StatCardProps {
  stat: Stat;
  /** This stat's entries (all-time), newest first. */
  entries: Entry[];
}

export function StatCard({ stat, entries }: StatCardProps) {
  const pending = usePendingEntries();
  const addEntry = useAddEntry();
  const [dialogOpen, setDialogOpen] = useState(false);

  const myPending = pending.filter((q) => q.stat === stat.id).length;
  const facts = useMemo(
    () => mergedFacts(stat, entries, pending),
    [stat, entries, pending],
  );
  const days = useMemo(
    () => (stat.kind === "boolean" ? markedDays(facts) : new Set<string>()),
    [stat.kind, facts],
  );
  const items = useMemo(
    () => (stat.kind === "collection" ? collectedItems(facts) : []),
    [stat.kind, facts],
  );

  const sparkPoints = useMemo(() => {
    if (stat.kind === "additive") {
      return dailySeries(entries, "month").map((p) => ({ v: p.cumulative }));
    }
    if (stat.kind === "measurement") {
      return readingSeries(entries, "month").map((p) => ({ v: p.value }));
    }
    if (stat.kind === "collection") {
      return collectionSeries(items).map((p) => ({ v: p.value }));
    }
    return [];
  }, [stat.kind, entries, items]);

  const todayMarked =
    stat.kind === "boolean" && days.has(dayKey(new Date().toISOString()));

  function quickAdd() {
    if (stat.kind === "boolean") {
      if (!todayMarked) {
        addEntry.mutate({ stat: stat.id, value: 1, ts: new Date().toISOString() });
      }
      return;
    }
    if (stat.kind === "additive" && stat.defaultIncrement) {
      addEntry.mutate({
        stat: stat.id,
        value: stat.defaultIncrement,
        ts: new Date().toISOString(),
      });
      return;
    }
    setDialogOpen(true);
  }

  let big: string;
  let caption: string;
  if (stat.kind === "boolean") {
    const h = booleanHeadline(days, "month");
    big = h.denominator === null ? `${h.count}` : `${h.count} / ${h.denominator}`;
    caption = "of last 30 days";
  } else if (stat.kind === "collection") {
    big = stat.universeSize
      ? `${items.length} / ${formatValue(stat.universeSize)}`
      : `${items.length}`;
    caption = "collected";
  } else {
    const total = headline(stat, entries, pending, "year");
    big = total === null ? "—" : formatValue(total);
    caption = stat.kind === "additive" ? "this year" : "latest";
  }
  const streak = stat.kind === "boolean" ? currentStreak(days) : 0;

  return (
    <Card className="relative">
      <CardHeader className="flex-row items-center justify-between">
        <Link to={`/stat/${stat.id}`} className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2 truncate">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: colorVar(stat.color) }}
            />
            {stat.name}
          </CardTitle>
        </Link>
        <Button
          size="icon"
          variant="secondary"
          aria-label={
            stat.kind === "boolean"
              ? `Mark ${stat.name} today`
              : `Log ${stat.name}`
          }
          aria-pressed={stat.kind === "boolean" ? todayMarked : undefined}
          onClick={quickAdd}
          disabled={addEntry.isPending || todayMarked}
        >
          {todayMarked ? <Check /> : <Plus />}
        </Button>
      </CardHeader>
      <CardContent>
        <Link to={`/stat/${stat.id}`} className="block">
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-semibold">
              {big}
              {stat.kind === "additive" || stat.kind === "measurement" ? (
                stat.unit ? (
                  <span className="ml-1 text-base font-normal text-muted-foreground">
                    {stat.unit}
                  </span>
                ) : null
              ) : null}
            </div>
            {streak > 1 ? (
              <span className="flex items-center gap-0.5 text-sm font-medium text-muted-foreground">
                <Flame className="size-4" style={{ color: colorVar(stat.color) }} />
                {streak}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {caption}
            {myPending > 0 ? ` · ${myPending} pending sync` : ""}
          </div>
          <div className="mt-2">
            {stat.kind === "boolean" ? (
              <DotStrip days={days} count={14} color={stat.color} />
            ) : (
              <Sparkline points={sparkPoints} color={stat.color} />
            )}
          </div>
        </Link>
      </CardContent>
      <AddEntryDialog
        stat={stat}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        itemSuggestions={items.map((i) => i.name)}
      />
    </Card>
  );
}
