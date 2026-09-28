# Step 01 – Book an appointment

Two handlers: `bookAppointment` and `listAppointments`. Appointments live in a plain array – and vanish on restart.

```sh
yarn step:01
curl -X POST localhost:3000/bookAppointment -H 'Content-Type: application/json' \
  -d '{"name":"Ada","phone":"+15550000001","at":"2030-01-01T10:00:00Z"}'
curl -X POST localhost:3000/listAppointments
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/book-an-appointment
