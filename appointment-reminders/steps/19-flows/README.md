# Step 19 – Flows

Referral batches wait for reception's review before anybody is imported or texted.

```sh
yarn step:19
curl -X POST localhost:3000/data/flows/referrals -H 'Content-Type: application/json' \
  -d '{"practice":"Hopper Family Practice","contact":"+15550000200","referrals":[{"name":"Dorothy Vaughan","phone":"+15550000011","at":"2030-02-01T09:00:00.000Z"}]}'
curl -X POST localhost:3000/reception/reviewReferrals -H 'Content-Type: application/json' \
  -d '{"runId":"<runId>","accepted":true,"by":"Grace"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/flows
