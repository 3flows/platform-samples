# Step 15 – Pipelines

The import becomes a pipeline triggered by an HTTP upload. A second pipeline takes CRM updates from a queue.

```sh
yarn step:15
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary $'Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;\n'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/pipelines
