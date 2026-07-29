/// <reference path="../pb_data/types.d.ts" />

// Notch schema: stats (what is tracked) + entries (event log).
// Totals are never stored — always derived client-side from entries.
migrate(
  (app) => {
    const authRule = '@request.auth.id != ""';

    const stats = new Collection({
      name: "stats",
      type: "base",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      fields: [
        { name: "name", type: "text", required: true, max: 100 },
        {
          name: "kind",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["additive", "measurement"],
        },
        { name: "unit", type: "text", max: 20 },
        { name: "color", type: "text", required: true, max: 30 },
        { name: "defaultIncrement", type: "number" },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(stats);

    const entries = new Collection({
      name: "entries",
      type: "base",
      listRule: authRule,
      viewRule: authRule,
      createRule: authRule,
      updateRule: authRule,
      deleteRule: authRule,
      indexes: [
        "CREATE INDEX `idx_entries_stat_ts` ON `entries` (`stat`, `ts`)",
      ],
      fields: [
        {
          name: "stat",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: stats.id,
          cascadeDelete: true,
        },
        { name: "value", type: "number", required: true },
        // ts is the moment the event happened (user-settable: offline
        // entries are logged later than they occurred), distinct from the
        // record's own created timestamp.
        { name: "ts", type: "date", required: true },
        { name: "created", type: "autodate", onCreate: true },
      ],
    });
    app.save(entries);
  },
  (app) => {
    for (const name of ["entries", "stats"]) {
      const c = app.findCollectionByNameOrId(name);
      if (c) app.delete(c);
    }
  }
);
