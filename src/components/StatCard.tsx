import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "@/components/Sparkline";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { dailySeries, formatValue, headline, readingSeries } from "@/lib/aggregate";
import { useAddEntry, usePendingEntries } from "@/lib/hooks";
import { colorVar, type Entry, type Stat } from "@/lib/types";

interface StatCardProps {
  stat: Stat;
  /** This stat's entries since Jan 1, newest first. */
  entries: Entry[];
}

export function StatCard({ stat, entries }: StatCardProps) {
  const pending = usePendingEntries();
  const addEntry = useAddEntry();
  const [dialogOpen, setDialogOpen] = useState(false);

  const total = headline(stat, entries, pending, "year");
  const myPending = pending.filter((q) => q.stat === stat.id).length;

  const sparkPoints = useMemo(() => {
    if (stat.kind === "additive") {
      return dailySeries(entries, "month").map((p) => ({ v: p.cumulative }));
    }
    return readingSeries(entries, "month").map((p) => ({ v: p.value }));
  }, [stat.kind, entries]);

  function quickAdd() {
    if (stat.kind === "measurement" || !stat.defaultIncrement) {
      setDialogOpen(true);
      return;
    }
    addEntry.mutate({
      stat: stat.id,
      value: stat.defaultIncrement,
      ts: new Date().toISOString(),
    });
  }

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
          aria-label={`Log ${stat.name}`}
          onClick={quickAdd}
          disabled={addEntry.isPending}
        >
          <Plus />
        </Button>
      </CardHeader>
      <CardContent>
        <Link to={`/stat/${stat.id}`} className="block">
          <div className="text-3xl font-semibold">
            {total === null ? "—" : formatValue(total)}
            {stat.unit ? (
              <span className="ml-1 text-base font-normal text-muted-foreground">
                {stat.unit}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {stat.kind === "additive" ? "this year" : "latest"}
            {myPending > 0 ? ` · ${myPending} pending sync` : ""}
          </div>
          <div className="mt-2">
            <Sparkline points={sparkPoints} color={stat.color} />
          </div>
        </Link>
      </CardContent>
      <AddEntryDialog stat={stat} open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}
