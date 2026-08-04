import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddEntry } from "@/lib/hooks";
import type { Stat } from "@/lib/types";

/** datetime-local input value for "now". */
function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** date input value for "today". */
function todayLocal(): string {
  return nowLocal().slice(0, 10);
}

interface AddEntryDialogProps {
  stat: Stat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Collection only: previously logged item names for autocomplete. */
  itemSuggestions?: string[];
}

/**
 * Full entry form (backdating allowed). Fields depend on kind:
 * additive/measurement = value + moment, boolean = day only (value is 1,
 * ignored), collection = item name + moment (value is 1, ignored).
 */
export function AddEntryDialog({
  stat,
  open,
  onOpenChange,
  itemSuggestions = [],
}: AddEntryDialogProps) {
  const addEntry = useAddEntry();
  const [value, setValue] = useState("");
  const [item, setItem] = useState("");
  const [when, setWhen] = useState(nowLocal);
  const [day, setDay] = useState(todayLocal);
  const [queued, setQueued] = useState(false);

  function reset() {
    setValue("");
    setItem("");
    setWhen(nowLocal());
    setDay(todayLocal());
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    let payload: { value: number; item?: string; ts: string };
    if (stat.kind === "boolean") {
      // Noon local avoids DST edges shifting the mark to a neighboring day.
      payload = { value: 1, ts: new Date(`${day}T12:00`).toISOString() };
    } else if (stat.kind === "collection") {
      if (item.trim() === "") return;
      payload = { value: 1, item: item.trim(), ts: new Date(when).toISOString() };
    } else {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return;
      payload = { value: parsed, ts: new Date(when).toISOString() };
    }
    const where = await addEntry.mutateAsync({ stat: stat.id, ...payload });
    setQueued(where === "queued");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stat.kind === "boolean" ? `Mark ${stat.name}` : `Log ${stat.name}`}
            {queued ? " (offline — will sync)" : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          {stat.kind === "collection" ? (
            <div className="grid gap-2">
              <Label htmlFor="entry-item">Item</Label>
              <Input
                id="entry-item"
                list="entry-item-suggestions"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="France"
                autoFocus
                required
              />
              <datalist id="entry-item-suggestions">
                {itemSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          ) : stat.kind !== "boolean" ? (
            <div className="grid gap-2">
              <Label htmlFor="entry-value">
                {stat.kind === "additive" ? "Amount" : "Reading"}
                {stat.unit ? ` (${stat.unit})` : ""}
              </Label>
              <Input
                id="entry-value"
                type="number"
                step="any"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
                required
              />
            </div>
          ) : null}
          {stat.kind === "boolean" ? (
            <div className="grid gap-2">
              <Label htmlFor="entry-day">Day</Label>
              <Input
                id="entry-day"
                type="date"
                value={day}
                max={todayLocal()}
                onChange={(e) => setDay(e.target.value)}
                autoFocus
                required
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="entry-when">When</Label>
              <Input
                id="entry-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                required
              />
            </div>
          )}
          {addEntry.isError ? (
            <p className="text-sm text-destructive">
              {addEntry.error instanceof Error
                ? addEntry.error.message
                : "Failed to save"}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={addEntry.isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
