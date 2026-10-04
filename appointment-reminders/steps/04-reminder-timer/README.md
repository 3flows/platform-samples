# Step 04 – Send reminders

A timer route sends reminders for appointments in the next 24 hours. The schedule lives in YAML.

```sh
yarn step:04
curl -X POST localhost:3000/sendDueReminders
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/send-reminders
