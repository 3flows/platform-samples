# Step 15 – Dead letters

Records a pipeline can't process are kept, with their input and the error, instead of being skipped silently.

```sh
yarn step:15
printf 'Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;\nNo Phone;;2030-01-16 11:00;\n' > legacy.csv
curl -X POST localhost:3000/data/imports/appointments -H 'Content-Type: text/csv' --data-binary @legacy.csv
curl -X POST localhost:3000/data/deadLetters
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/dead-letters
