# Step 14 – Sync from a database

A pipeline reads the patients of a partner practice from SQL, every night and on demand.
The memory database is seeded on start (`seed.ts`).

```sh
yarn step:14
curl -X POST localhost:3000/data/syncs/practice
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/sync-from-a-database
