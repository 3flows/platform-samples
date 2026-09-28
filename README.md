# 3flows Platform Samples

Runnable samples for [`@3flows/platform`](https://github.com/3flows/platform).
The samples back the tutorial in the [platform documentation](https://3flows.github.io/platform-docs/).

## Appointment reminders

A small app that grows step by step – from Hello World to a domain model with a generated GraphQL API,
a small data hub with pipelines and flows, built-in operations, and finally several cooperating processes.
Every step continues from the one before it.

| Step | Concept |
|---|---|
| **Part 1: Build it** | |
| [00-hello-world](appointment-reminders/steps/00-hello-world) | Service, handler, YAML |
| [01-book-appointment](appointment-reminders/steps/01-book-appointment) | Handlers with input/output schemas |
| [02-store-appointments](appointment-reminders/steps/02-store-appointments) | `docs` |
| [03-sms-confirmation](appointment-reminders/steps/03-sms-confirmation) | `sms` |
| [04-reminder-timer](appointment-reminders/steps/04-reminder-timer) | Timers |
| [05-remember-reminders](appointment-reminders/steps/05-remember-reminders) | `kv` |
| [06-async-with-queues](appointment-reminders/steps/06-async-with-queues) | `mq` |
| [07-notifications-service](appointment-reminders/steps/07-notifications-service) | Service-to-service calls |
| **Part 2: Model and expose it** | |
| [08-entities](appointment-reminders/steps/08-entities) | Entities and references |
| [09-ontology](appointment-reminders/steps/09-ontology) | Ontology – the domain model in one place |
| [10-graphql](appointment-reminders/steps/10-graphql) | GraphQL generated from the ontology |
| [11-natural-keys](appointment-reminders/steps/11-natural-keys) | Natural keys – identity derived from the data |
| **Part 3: Become a data hub** | |
| [12-transformers](appointment-reminders/steps/12-transformers) | Transformers – CSV import into entities, CSV export |
| [13-pipelines](appointment-reminders/steps/13-pipelines) | Pipelines triggered by HTTP uploads and queues |
| [14-sql-sync](appointment-reminders/steps/14-sql-sync) | `sqls` and timers – sync from a database |
| [15-dead-letters](appointment-reminders/steps/15-dead-letters) | Dead letters for records that can't be processed |
| [16-medallion-lineage](appointment-reminders/steps/16-medallion-lineage) | Bronze, silver, gold and lineage |
| [17-flows](appointment-reminders/steps/17-flows) | Flows – a process that waits for a human, calls services and runs pipelines |
| **Part 4: Operate it** | |
| [18-operations](appointment-reminders/steps/18-operations) | Built-in endpoints: ping, health, metrics, OpenAPI, JSON-RPC |
| [19-admin](appointment-reminders/steps/19-admin) | Admin / control-plane API |
| **Part 5: Scale it** | |
| [20-separate-processes](appointment-reminders/steps/20-separate-processes) | `remotes` – same code, two processes |
| [21-discovery](appointment-reminders/steps/21-discovery) | `registries` and `discovery` – no URLs in the caller's configuration |

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
npm run step:21:registry   # multi-process steps have one script per process
```
