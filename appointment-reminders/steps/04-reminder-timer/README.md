# Step 04 – Send reminders

A timer route reminds appointments in the next 24 hours – and reveals a problem: every run reminds again.

```sh
npm run step:04
curl -X POST localhost:3000/sendDueReminders
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/send-reminders
