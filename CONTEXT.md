# Notch — Context

Glossary of domain terms. Implementation details live elsewhere.

Notch is a personal stat tracker: the user carves Entries into Stats and watches derived graphs grow.

## Glossary

### Stat
A named series the user tracks (e.g. "Push-ups", "Books read", "People invited"). A Stat defines *what* is tracked and how values are interpreted; it holds no totals itself. Described by: name, kind, optional unit label, color, optional default increment. Goals/targets are explicitly out of scope.

### Stat kind
Every Stat is one of four kinds:
- **Additive** — entries are increments; aggregates sum them (push-ups, books read, people invited).
- **Measurement** — entries are point-in-time readings; summing is meaningless, aggregates take last/avg per period (weight, sleep hours). A rating is a Measurement bounded 1–5.
- **Boolean** — entries mark a day as done (worked out, meditated); the entry's value is meaningless (stored as 1, ignored). Aggregates count *distinct days with ≥1 entry* — duplicate marks for a day are harmless, deduped at derivation, never rejected at write. Un-marking a day is an Entry correction (online-only).
- **Collection** — entries name a distinct item collected (countries visited, ski resorts skied); the entry's value is meaningless (stored as 1, ignored). Aggregates count *distinct items*, deduped by normalized item name (trimmed, case-folded) at derivation. A Collection may declare a *universe size* (195 countries exist) — a fixed fact about the world shown as a denominator, not a goal; goals remain out of scope.

### Entry
A single logged event belonging to one Stat: a value and a timestamp (e.g. "20 push-ups at 9am"). Totals are never stored, always derived. Entries may be corrected (edited/deleted) only while online; the offline queue is strictly append-only.

### Offline queue
Locally persisted Entries awaiting push to the backend. Append-only — corrections never enter the queue, so sync is conflict-free by construction.

### Total / Aggregate
A derived number computed from Entries (sum, count, streak…) over a period. Never stored. "Books read this year" = the "Books read" Stat aggregated over the current year.

### Streak
A Boolean-stat aggregate: a run of consecutive marked days. The *current streak* is the run ending today or yesterday — an unmarked today does not break it (the day isn't over). The *longest streak* is the best run ever. Streaks are period-independent and derived, never stored.

### Period
A display-time filter over Entries (day, week, month, year, all-time). Resets (e.g. yearly reset for books) are a Period concern, not a data concern.
