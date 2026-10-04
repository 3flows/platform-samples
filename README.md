# 3flows Platform Samples

Runnable samples for [`@3flows/platform`](https://github.com/3flows/platform).
The samples back the tutorial in the [platform documentation](https://3flows.github.io/platform-docs/).

## Appointment reminders

A small app that grows step by step, from Hello World to several cooperating processes.
Every step starts with the obvious way to do the next thing, runs into its problem, and solves it with one platform concept.
Every step continues from the one before it.

| Step | Problem | Concept |
|---|---|---|
| **Part 1: Build it** | | |
| [00-hello-world](appointment-reminders/steps/00-hello-world) | How little does it take? | Service, handler, YAML |
| [01-book-appointment](appointment-reminders/steps/01-book-appointment) | Garbage gets in | Handler contracts: input and output schemas |
| [02-store-appointments](appointment-reminders/steps/02-store-appointments) | A restart loses everything | `docs` |
| [03-sms-confirmation](appointment-reminders/steps/03-sms-confirmation) | A provider SDK and credentials in the code | `sms` |
| [04-reminder-timer](appointment-reminders/steps/04-reminder-timer) | `setInterval` outlives the app | Timers |
| [05-remember-reminders](appointment-reminders/steps/05-remember-reminders) | Reminders again and again | `kv` |
| [06-async-with-queues](appointment-reminders/steps/06-async-with-queues) | A fire-and-forget SMS crashes the API | `mq` |
| [07-notifications-service](appointment-reminders/steps/07-notifications-service) | One service does everything | Service-to-service calls |
| **Part 2: Model it and open it up** | | |
| [08-entities](appointment-reminders/steps/08-entities) | Ada twice, nothing validated | Entities and references |
| [09-domain](appointment-reminders/steps/09-domain) | The model is scattered, relationships are strings | `domain` |
| [10-graphql](appointment-reminders/steps/10-graphql) | One handler per query doesn't scale | GraphQL from the domain |
| [11-natural-keys](appointment-reminders/steps/11-natural-keys) | GraphQL creates a second Ada | Natural keys |
| [12-ontology](appointment-reminders/steps/12-ontology) | Types without meaning | `ontologies` |
| [13-mcp](appointment-reminders/steps/13-mcp) | An assistant pointed at GraphQL can do anything | `mcps` |
| **Part 3: Become a data hub** | | |
| [14-transformers](appointment-reminders/steps/14-transformers) | Import a CSV, export for analytics | Transformers |
| [15-pipelines](appointment-reminders/steps/15-pipelines) | Every source repeats the plumbing | Pipelines |
| [16-sql-sync](appointment-reminders/steps/16-sql-sync) | The data sits in a partner's database | `sqls`, SQL sources, timer triggers |
| [17-dead-letters](appointment-reminders/steps/17-dead-letters) | Bad records vanish or stop everything | Dead letters |
| [18-medallion-lineage](appointment-reminders/steps/18-medallion-lineage) | No replay, no provenance | Bronze, silver, gold, lineage |
| [19-flows](appointment-reminders/steps/19-flows) | A process that waits for days | Flows |
| **Part 4: Connect it** | | |
| [20-slack](appointment-reminders/steps/20-slack) | Reception lives in Slack, not in curl | Connectors |
| **Part 5: Operate it** | | |
| [21-operations](appointment-reminders/steps/21-operations) | Is it alive? | Built-in endpoints |
| [22-admin](appointment-reminders/steps/22-admin) | What is actually running? | Admin API, `Platform.inspect()` |
| [23-vaults](appointment-reminders/steps/23-vaults) | Real credentials, but not in YAML | `vaults` and `$vault` |
| **Part 6: Scale it** | | |
| [24-separate-processes](appointment-reminders/steps/24-separate-processes) | Notifications should run on its own | `remotes` |
| [25-discovery](appointment-reminders/steps/25-discovery) | Callers hardcode URLs | `registries` and `discovery` |
| [26-workload-identity](appointment-reminders/steps/26-workload-identity) | Anyone can call notifications | `identities`, `idps`, workload tokens |

Every step is complete and has a test. All steps use in-memory providers, so no database, broker, SMS account, Slack workspace, SQL server or vault is needed.

## Start your own project

[`starter/`](starter) is an empty project: `package.json`, `tsconfig.json`, `.yarnrc.yml`, one HTTP server and a test.
Copy it, or follow the [setup page](https://3flows.github.io/platform-docs/docs/tutorial/setup) of the tutorial.

## Run

You need Node.js 24+, Corepack (it ships with Node.js) and access to the 3flows repositories on GitHub.
The platform comes from GitHub Packages (`@3flows/platform@next`), which needs a GitHub token with `read:packages`.

```sh
corepack enable
export NPM_REPOSITORY_GH_TOKEN=<a GitHub token with read:packages>
git clone https://github.com/3flows/platform-samples.git
cd platform-samples/appointment-reminders
yarn install
yarn test                 # runs every step
yarn step:03              # runs a single step
yarn step:25:registry     # multi-process steps have one script per process
```

To pick up a newer `next` build of the platform: `yarn up @3flows/platform@next`.
