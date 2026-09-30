# Building applications on the 3flows Platform – rules for agents

> **Status: draft.** This file tells a coding agent how to build applications with `@3flows/platform`.
> Read it completely before writing code. It's short on purpose.

## Why these rules exist

You write the code. A human reviews it and takes responsibility for it in production.
The platform gives both of you a small, shared vocabulary. **Code that only uses that vocabulary is fast to review.
Code that goes around it isn't.** When in doubt, choose the solution a reviewer understands in one read.

## 1. Pick the primitive

| You need… | Use | Not |
|---|---|---|
| An API endpoint | `handler(name, inputSchema, outputSchema, fn)` in a `Service` | Express routes, hand-written validation |
| Business data (documents) | `trigger.context.doc()` | A database driver |
| Small state: flags, markers, counters | `trigger.context.kv()` | A `docs` collection of booleans |
| Relational data, or a database you don't own | `trigger.context.sql(name)` | A SQL client library |
| Files | `trigger.context.blob()` | `fs`, cloud SDKs |
| Work that shouldn't block the caller | `mq().queue(name).send(...)` plus a queue route | `setTimeout`, fire-and-forget promises |
| Something on a schedule | A timer route, with its schedule in `timers` | `setInterval`, cron libraries |
| SMS or email | `sms()` / `email()` | Provider SDKs |
| A password, API key or token for a provider | A `$vault` reference in YAML | `${{ ENV }}`, literals in YAML, `process.env` |
| A secret the code itself needs at runtime | `trigger.context.vault().secret(path).key(k).get()` | Config files, `process.env` |
| Another service's logic | `service(name).method(m).input(x).call()` | Importing its class, HTTP clients |
| A domain model | An `ontology` with entities and relationships | Ad-hoc document shapes |
| "The same thing" arriving twice | A **natural key** in the ontology (`{ key: [...] }`) | Find-or-create lookups |
| A generated query API | `graphqls` in YAML | Hand-written resolvers per entity |
| Data from another system (files, queues, databases) | A `Pipeline` | A handler that loops over records |
| Records that can't be processed | `.onError(stage).deadLetter()` | `try/catch` and `console.log` |
| A process with several steps, that may wait for a person or an event | A `Flow` | A `status` field and several handlers |
| Health, metrics, API description | Nothing, they're built in | Custom `/health` handlers |

If nothing in this table fits, stop and ask the human. Don't invent a new mechanism.

## 2. Hard rules

1. **Import only from `@3flows/platform`.** Never from `dist/...` or internal paths.
2. **Use Yarn** (`packageManager: yarn@4.18.0`, `nodeLinker: node-modules`). Start new projects from `starter/`.
3. **No infrastructure SDKs or drivers in application code.** No `mongodb`, `pg`, `redis`, `amqplib`, `twilio`, `@aws-sdk/*`. The platform owns them.
4. **Reach infrastructure through `trigger.context`** (or `this.doc()`, `this.kv()`, … inside a service). Never construct providers yourself.
5. **Code says *what*. YAML says *where* and *with what*.** Ports, providers (`memory`, `mongo`, `postgres`, …), connection strings, schedules, which services run in which process: all YAML. Secrets come from a vault: `connectionString: { $vault: { path: mongo, key: connectionString } }`. Environment variables (`${{ … }}`) are for settings that aren't secret, and for bootstrapping the vault itself.
6. **Every class used in YAML has `@Register()`**, and its module is imported by `main.ts`.
7. **Every handler has input and output schemas** built with `t` (Zod). Handlers without input use `t.object({}).optional()`.
8. **Answer with `trigger.ok(...)`**, exactly once.
9. **Services call each other by name** through `service(...)`. They never import each other. Where a service runs is decided in YAML (`remotes`, `discovery`), not in code.
10. **Identity belongs in the ontology.** If two records should be "the same", declare a natural key. Normalize key fields (phone numbers, e-mail case) *before* they reach the entity.
11. **Pipelines go in `pipelines.register`, flows in `flows.register`**, not in `services`. Their HTTP triggers are exposed through `https` like any other service. Queue triggers need an `mqs[].use` entry.
12. **Mapping is data.** Put mappings from external formats into their own file (`legacy.ts`, `crm.ts`) as `EntityTarget[]` or small pure functions. Reviewers read these closely.
13. **Development and tests use `memory` providers.** Every provider type must be switchable in YAML without code changes.
14. **Don't use platform internals** to reach services: `Platform.get(...)`, `registry[...]`, delegates. The one current exception is resuming a flow (see section 6).

## 3. The shapes to copy

**A service**

```ts
import { Register, Route, Service, handler, t } from '@3flows/platform';

@Register()
export class AppointmentsService extends Service {
    handlers = () => [
        handler('bookAppointment', BookAppointment, Appointment, async (input, trigger) => {
            const { mq } = trigger.context;
            const appointment = await Appointments.create(/* … */);
            await mq().queue('appointment-booked').send(appointment);
            await trigger.ok(appointment);
        })
    ];

    routes(): Route {
        const route = super.routes();
        route.timer('reminders').do(async (_params, trigger) => { /* … */ });
        route.mq().queue('appointment-booked').do(async (message, trigger) => { /* … */ });
        return route;
    }
}
```

**A domain model**

```ts
export const AppointmentsOntology = ontology('AppointmentsOntology', (o) => {
    const Customer = o.entity('Customer', { name: o.string(), phone: o.string() }, { key: ['phone'] });
    o.entity('Appointment', { at: o.string(), customer: o.one(Customer).inverse('appointments') }, { key: ['customer', 'at'] });
});
export const Customers = ENTITIES['Customer'];
```

**A pipeline**, read top to bottom: trigger, source, steps, errors, sink.

```ts
@Register()
export class CrmCustomersPipeline extends Pipeline {
    define() {
        return this.pipeline('crm-customers')
            .on.mq().queue('crm-customers')
            .from.trigger().payload()
            .toEntity(Customers, { name: (customer) => customer.fullName })
            .onError('entity').deadLetter()
            .deadLetters().to.doc().db('datahub').collection('dead_letters')
            .lineage().to.doc().db('datahub').collection('lineage');
    }
}
```

**A flow**: steps in the order the business describes them.

```ts
@Register()
export class ReferralFlow extends Flow {
    define() {
        return this.flow('referrals')
            .on.http().post('/referrals')
            .from.trigger().payload()
            .step('notify-reception').call('NotificationsService').method('referralsReceived').input((ctx) => ({ … }))
                .retry({ attempts: 3, backoffMs: 1000 })
            .waitFor('review').event('referrals.reviewed').correlate((ctx) => ctx.runId).timeout('3d')
            .when('accepted', (ctx) => ctx.event.accepted)
                .step('import').pipeline('referral-import').input((ctx) => ctx.input.referrals)
            .end()
            .output((ctx) => ({ accepted: ctx.event.accepted }));
    }
}
```

**The YAML**, in this order: what runs, how it's exposed, what it needs.

```yaml
name: appointment-reminders

services:
  - name: AppointmentsService

pipelines:
  register:
    - name: CrmCustomersPipeline

flows:
  state: { type: doc, db: datahub, collection: flow_runs }
  register:
    - name: ReferralFlow

https:
  - name: api
    port: 3000
    services:
      - name: AppointmentsService
      - name: ReferralFlow
        basepath: /data/flows   # every service on a server needs its own path

docs:
  - name: DEFAULT
    type: memory

entities:
  backend: docs
  db: appointments
  ontologies:
    - AppointmentsOntology

mqs:
  - name: DEFAULT
    type: memory
    use:
      - AppointmentsService
      - CrmCustomersPipeline

timers:
  - service: AppointmentsService
    name: reminders
    cron: '0 * * * * *'
    runImmediatly: false   # sic: this is the field name
```

## 4. Anti-patterns

| Instead of… | Do… |
|---|---|
| `find(...)` then `create(...)` to avoid duplicates | A natural key. `create` with a known key updates |
| A handler that parses a file, loops, saves and counts | A pipeline. It streams, batches, reports and dead-letters |
| Wrapping a file in JSON (`{ "csv": "…" }`) | `.from.trigger().stream()` with `Content-Type: text/csv` |
| `status: 'pending'` fields and "check later" handlers | A flow with `waitFor` |
| Swallowing errors to keep a run alive | An error policy: `skip()` only if losing the record is acceptable, otherwise `deadLetter()` |
| Arrays or maps on a service instance as storage | `docs` or `kv`. Instances restart and scale |
| Sending SMS inside a booking request | Publish to a queue, send from the queue route |
| A URL of another service in code | `service(name)` in code, `remotes` or `discovery` in YAML |
| Custom health or OpenAPI endpoints | `wellknown` in the `https` configuration |
| A password in YAML, or `${{ DB_PASSWORD }}` | A `$vault` reference. Between environments, only the `vaults` entry changes |
| One vault entry with every secret for every process | Each process's YAML references only the secrets that process uses |
| Exposing `admins` on a public server | `readonly: true`, `auth`, or an internal `https` server |

## 5. Tests and the definition of done

- Every change has a test with `node:test` that starts the platform with the app's YAML and **memory providers**:
  `before(() => Platform.run('./…/platform.yml'))`, `after(() => Platform.shutdown())`.
- Tests use a `memory` vault with fake values in its `secrets`. Never put a real secret in YAML, tests or code.
- Test through the public surface: HTTP, JSON-RPC, GraphQL, queues. Check effects through entities or `docs`.
- `yarn test` passes. Don't mark work done that you haven't run.
- Finish every change with a **reviewer's view**, three to five lines:
  - what the change does, in domain words,
  - which primitives it uses,
  - what changed in YAML (exposure, providers, processes, secrets),
  - the one question the reviewer should really think about (a key, a mapping, who may call an endpoint, what happens to bad data).

  If the reviewer's view is hard to write, the change is too big or goes around the platform.

## 6. Known gaps (as of this draft)

These are platform limitations. Work around them as described, and mention them in the reviewer's view.

- **Failing timer runs of pipelines and flows crash the process.** A pipeline or flow with `.on.timer(...)` whose run throws (a source is down, the pipeline is paused) ends in an unhandled rejection. Don't pause timer-triggered pipelines. Prefer HTTP or queue triggers for anything that can fail, or accept the risk explicitly.
- **Pipeline and flow timers ignore coordinators.** With several instances, they run in every instance. Make them idempotent (natural keys) or run them in one process only.
- **Discovery resolves to the first registered instance.** It doesn't spread load. Give each instance its own `runtime.id`, or registrations overwrite each other.
- **Secrets are read once, at startup.** `$vault` references are resolved before services start. `Platform.reload()` with unchanged YAML does nothing, so a rotated secret needs a restart. If code must see rotations, read the secret with `vault()` when it's used.
- **`$vault` can't be used inside `vaults`.** The vault's own credentials come from `${{ … }}` or from the environment's identity (Azure managed identity, Kubernetes service account JWT for HashiCorp).
- **Secret names must work in every backend.** Azure Key Vault allows only letters, digits and dashes: use `practice-database`, not `databases/practice`.
- **Resuming a flow** has no public entry point yet. Use `Platform.get<Flows>('flows').resume({ event, correlation, payload })` from a handler, and nothing else from `Platform.get`.

## 7. Where to look

1. **This file.**
2. **The tutorial samples:** `appointment-reminders/steps/`. Find the step closest to your task and copy its patterns. Each step is small, tested and continues from the one before:
   services 00–07, model and GraphQL 08–11, data hub 12–17, operations and secrets 18–20, processes 21–22.
3. **The docs:** https://3flows.github.io/platform-docs/, especially *Core concepts* and the *Configuration reference*.
4. **The public types** of `@3flows/platform` (`.d.ts` files) for exact signatures.
5. **The platform's own tests** for usage of features the samples don't cover.
6. The platform source only to confirm a behavior. Never copy internals from it.

If the right way to do something isn't covered here, ask the human rather than improvising. The answer probably belongs in this file.
