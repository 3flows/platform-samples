# Step 13 – Pipelines

The import becomes a declarative pipeline behind an upload endpoint. A second pipeline takes customer updates from a queue.

```sh
npm run step:13
printf 'Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;first visit\n' > legacy.csv
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/pipelines
