# 3flows Platform Samples

Runnable samples for [`@3flows/platform`](https://github.com/3flows/platform).
The samples back the tutorial in the [platform documentation](https://3flows.github.io/platform-docs/).

## Appointment reminders

A small app that grows step by step – from Hello World to two cooperating processes, a domain model and a generated GraphQL API.
Steps 09–13 continue from the single-process version of step 07.

| Step | Concept |
|---|---|
| [00-hello-world](appointment-reminders/steps/00-hello-world) | Service, handler, YAML |
| [01-book-appointment](appointment-reminders/steps/01-book-appointment) | Handlers with input/output schemas |
| [02-store-appointments](appointment-reminders/steps/02-store-appointments) | `docs` |
| [03-sms-confirmation](appointment-reminders/steps/03-sms-confirmation) | `sms` |
| [04-reminder-timer](appointment-reminders/steps/04-reminder-timer) | Timers |
| [05-remember-reminders](appointment-reminders/steps/05-remember-reminders) | `kv` |
| [06-async-with-queues](appointment-reminders/steps/06-async-with-queues) | `mq` |
| [07-notifications-service](appointment-reminders/steps/07-notifications-service) | Service-to-service calls |
| [08-separate-processes](appointment-reminders/steps/08-separate-processes) | `remotes` – same code, two processes |
| [09-operations](appointment-reminders/steps/09-operations) | Built-in endpoints: ping, health, metrics, OpenAPI, JSON-RPC |
| [10-entities](appointment-reminders/steps/10-entities) | Entities and references |
| [11-ontology](appointment-reminders/steps/11-ontology) | Ontology – the domain model in one place |
| [12-graphql](appointment-reminders/steps/12-graphql) | GraphQL generated from the ontology |
| [13-admin](appointment-reminders/steps/13-admin) | Admin / control-plane API |

Every step is complete and has a test. All steps use in-memory providers, so no database, broker or SMS account is needed.

## Run

Requires Node.js 24+.

The samples currently reference the platform as a sibling checkout (`../platform`, branch `next`/`nx`),
because the features used here are not yet released to the package registry.

```sh
git clone https://github.com/3flows/platform.git
(cd platform && git checkout nx && yarn install && yarn build)
git clone https://github.com/3flows/platform-samples.git
cd platform-samples/appointment-reminders
npm install
npm test          # runs every step
npm run step:03   # runs a single step
```
