# Step 16 – Medallion layers and lineage

The import keeps raw rows (bronze), cleaned rows (silver) and the domain model (gold).
Every pipeline records what it read and wrote, so you can ask where data comes from.

```sh
yarn step:16
printf 'Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;\nBad Date;+1 555 000 0004;someday;\n' > legacy.csv
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
curl -X POST localhost:3000/data/syncs/practice
curl -X POST localhost:3000/data/pipelineRuns
curl -X POST localhost:3000/data/lineage -H 'Content-Type: application/json' -d '{"asset":"entity:Customer"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/medallion-and-lineage
