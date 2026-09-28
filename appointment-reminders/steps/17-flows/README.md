# Step 17 – Flows

A partner practice refers patients in batches. Reception reviews every batch before anybody on it is texted.
The `ReferralFlow` notifies reception, waits for the review, runs the import pipeline only if the batch is accepted,
and tells the practice. While it waits, the run is a document in `datahub.flow_runs`.

```sh
npm run step:17
curl -X POST localhost:3000/data/flows/referrals -H 'Content-Type: application/json' \
  -d '{"practice":"Hopper Family Practice","contact":"+15550000200","referrals":[{"name":"Dorothy Vaughan","phone":"+15550000011","at":"2030-02-01T09:00:00.000Z"}]}'
curl -X POST localhost:3000/reception/pendingReviews
curl -X POST localhost:3000/reception/reviewReferrals -H 'Content-Type: application/json' \
  -d '{"runId":"<runId from the first response>","accepted":true,"by":"Grace"}'
```

Tutorial: https://3flows.github.io/platform-docs/docs/tutorial/flows
