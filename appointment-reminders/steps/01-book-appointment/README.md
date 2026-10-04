# Step 01 – Book an appointment

Handlers with input and output contracts. Invalid requests are rejected with `400 INVALID_INPUT` before your code runs.

```sh
yarn step:01
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' -d '{"name":"Bob","at":"tomorrow"}'   # 400
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/book-an-appointment
