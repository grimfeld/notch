# Notch — Context

Glossary of domain terms. Implementation details live elsewhere.

Notch is a personal stat tracker: the user carves Entries into Stats and watches derived graphs grow.

## Glossary

### Stat
A named series the user tracks (e.g. "Push-ups", "Books read", "People invited"). A Stat defines *what* is tracked and how values are interpreted; it holds no totals itself. Described by: name, kind, optional unit label, color, optional default increment. Goals/targets are explicitly out of scope.

### Stat kind
Every Stat is one of two kinds:
- **Additive** — entries are increments; aggregates sum them (push-ups, books read, people invited). A boolean/habit is an Additive stat logged as +1.
- **Measurement** — entries are point-in-time readings; summing is meaningless, aggregates take last/avg per period (weight, sleep hours). A rating is a Measurement bounded 1–5.

### Entry
A single logged event belonging to one Stat: a value and a timestamp (e.g. "20 push-ups at 9am"). Totals are never stored, always derived. Entries may be corrected (edited/deleted) only while online; the offline queue is strictly append-only.

### Offline queue
Locally persisted Entries awaiting push to the backend. Append-only — corrections never enter the queue, so sync is conflict-free by construction.

### Total / Aggregate
A derived number computed from Entries (sum, count, streak…) over a period. Never stored. "Books read this year" = the "Books read" Stat aggregated over the current year.

### Period
A display-time filter over Entries (day, week, month, year, all-time). Resets (e.g. yearly reset for books) are a Period concern, not a data concern.
