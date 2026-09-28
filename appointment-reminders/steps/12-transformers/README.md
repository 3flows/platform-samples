# Step 12 – Transformers

Imports the CSV export of an old booking system with stream transformers, and exports appointments as CSV.

```sh
yarn step:12
curl -X POST localhost:3000/data/importAppointments -H 'Content-Type: application/json' \
  -d '{"csv":"Name;Mobile;Date;Notes\nAda Lovelace;+1 555 000 0001;2030-01-15 10:00;first visit\n"}'
curl localhost:3000/data/exports/appointments.csv
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/transformers
