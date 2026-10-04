# Step 20 – Reception works in Slack

A Slack connector (`@3flows/platform-connector-slack`, type `slack-memory`): the flow asks reception in Slack, and a reaction resumes it. Duplicate events are dropped, failing ones retried and dead-lettered.

```sh
yarn step:20
curl -X POST localhost:3000/data/flows/referrals -H 'Content-Type: application/json' \
  -d '{"practice":"Hopper Family Practice","contact":"+15550000200","referrals":[{"name":"Dorothy Vaughan","phone":"+15550000011","at":"2030-02-01T09:00:00.000Z"}]}'
curl -X POST localhost:3002/outbox   # what the app posted to Slack
curl -X POST localhost:3002/inject -H 'Content-Type: application/json' \
  -d '{"id":"Ev01","type":"reaction.added","payload":{"type":"reaction_added","user":"U0GRACE","reaction":"white_check_mark","item":{"channel":"C0RECEPTION","ts":"<ts from the flow report>"}}}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/slack
