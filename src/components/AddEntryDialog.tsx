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

interface AddEntryDialogProps {
  stat: Stat;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Full entry form: value + moment it happened (backdating allowed). */
export function AddEntryDialog({ stat, open, onOpenChange }: AddEntryDialogProps) {
  const addEntry = useAddEntry();
  const [value, setValue] = useState("");
  const [when, setWhen] = useState(nowLocal);
  const [queued, setQueued] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const where = await addEntry.mutateAsync({
      stat: stat.id,
      value: parsed,
      ts: new Date(when).toISOString(),
    });
    setQueued(where === "queued");
    setValue("");
    setWhen(nowLocal());
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setValue("");
          setWhen(nowLocal());
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Log {stat.name}
            {queued ? " (offline — will sync)" : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
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
