# Step 16 – Sync from a database

A pipeline pulls active patients from a partner's SQL database, nightly and on demand.

```sh
yarn step:16
curl -X POST localhost:3000/data/syncs/practice
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/sync-from-a-database
