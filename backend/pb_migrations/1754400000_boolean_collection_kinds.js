/// <reference path="../pb_data/types.d.ts" />

// New stat kinds: boolean (distinct marked days) + collection (distinct
// named items). Duplicates are deduped at derivation, never rejected at
// write (see docs/adr/0002) — hence no uniqueness constraints here.
migrate(
  (app) => {
    const stats = app.findCollectionByNameOrId("stats");
    const kind = stats.fields.getByName("kind");
    kind.values = ["additive", "measurement", "boolean", "collection"];
    // Collection only: size of the item universe (195 countries) — shown as
    // a denominator, not a goal.
    stats.fields.add(new NumberField({ name: "universeSize", min: 0 }));
    app.save(stats);

    const entries = app.findCollectionByNameOrId("entries");
    // Collection only: name of the item collected ("France").
    entries.fields.add(new TextField({ name: "item", max: 200 }));
    app.save(entries);
  },
  (app) => {
    const stats = app.findCollectionByNameOrId("stats");
    const kind = stats.fields.getByName("kind");
    kind.values = ["additive", "measurement"];
    stats.fields.removeByName("universeSize");
    app.save(stats);

    const entries = app.findCollectionByNameOrId("entries");
    entries.fields.removeByName("item");
    app.save(entries);
  }
);
