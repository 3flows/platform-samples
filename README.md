# 3flows Platform Samples

Runnable samples for [`@3flows/platform`](https://github.com/3flows/platform).
The samples back the tutorial in the [platform documentation](https://3flows.github.io/platform-docs/).

## Appointment reminders

A small app that grows step by step – from Hello World to two cooperating processes, a domain model, a generated GraphQL API
and finally a small data hub that imports, syncs and exports data through pipelines.
Steps 09–13 continue from the single-process version of step 07. Steps 14–19 continue from step 13.

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
| [14-natural-keys](appointment-reminders/steps/14-natural-keys) | Natural keys – identity derived from the data |
| [15-transformers](appointment-reminders/steps/15-transformers) | Transformers – CSV import into entities, CSV export |
| [16-pipelines](appointment-reminders/steps/16-pipelines) | Pipelines triggered by HTTP uploads and queues |
| [17-sql-sync](appointment-reminders/steps/17-sql-sync) | `sqls` and timers – sync from a database |
| [18-dead-letters](appointment-reminders/steps/18-dead-letters) | Dead letters for records that can't be processed |
| [19-medallion-lineage](appointment-reminders/steps/19-medallion-lineage) | Bronze, silver, gold and lineage |

Every step is complete and has a test. All steps use in-memory providers, so no database, broker, SMS account or SQL server is needed.

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
