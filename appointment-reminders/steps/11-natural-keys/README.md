# Step 11 – Natural keys

The ontology declares what identifies a customer (`phone`) and an appointment (`customer` + `at`).
IDs are derived from the data, so creating the same customer twice updates it instead of duplicating it.

```sh
npm run step:11
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-15T10:00:00.000Z"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/natural-keys
