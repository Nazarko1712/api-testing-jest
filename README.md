# api-testing-jest

Jest + Pactum API suite built around the three things an API test should
actually prove: that the **contract** holds, that **authorization** refuses the
right people, and that the suite's own **test data** cannot collide with anyone
else's.

**29 tests, 4 spec files.** Target:
[restful-booker](https://restful-booker.herokuapp.com) — a public demo API with
real auth, real persistence, and several real defects.

```bash
nvm use                  # Node 22
npm ci
npm test                 # everything
npm run test:auth        # authorization matrix
npm run test:bookings    # CRUD and filters
npm run test:contract    # documented API defects
npm run typecheck
```

No Docker, no local services, no seed step. Clone and run.

## Layout

```
src/clients/
  base.client.ts       HTTP verbs; every method takes the expected status
  booking.client.ts    domain methods returning typed payloads
src/schemas/
  booking.schema.ts    AJV schemas + custom Jest matchers
src/support/
  booking.factory.ts   per-run data builder
  global-setup.ts      reachability probe before the first test
  setup.ts             toMatchBookingSchema matchers
tests/
  auth/                authorization matrix
  bookings/            CRUD, filters, data-driven input
  contract/            defects found in the target API
```

## Three design decisions

### 1. The expected status code is a parameter, not a branch

```ts
await api.getBooking(id);           // expects 200
await api.getBooking(999999, 404);  // expects 404
```

Negative cases travel the **same code path** as positive ones. The alternative —
a separate "negative" client, or `try/catch` around every unhappy call —
duplicates request building, and the two copies drift until the negative tests
are quietly exercising a different request than the positive ones.

It also puts the expectation at the call site, so a test states what it believes
before it asserts anything.

### 2. Schemas and value assertions answer different questions

A value assertion answers *"is this booking's name Alice"*. A schema answers
*"is this still a booking"*.

The regression that reaches production is the second kind: a field changes from
number to string, an optional field becomes required, a nested object flattens.
Value assertions keep passing — the value is still present and equal after
coercion — while every consumer downstream breaks.

`additionalProperties: false` is deliberate. Without it a schema only proves the
expected fields exist; with it, an **unannounced new field fails the test**. On
an API holding user data that is the behaviour you want, because an extra field
nobody mentioned is how a response starts returning more than it should.

Schema failures report through a custom matcher, so the message is the AJV error
list rather than `expected true, received false`.

### 3. Test data is generated per run, never shared

```ts
aBooking().withUniqueName().build()
```

Shared fixtures are the first thing that makes a suite un-parallelisable: two
workers mutating the same record produce failures that look like product bugs
and cannot be reproduced on demand.

Cleanup lives next to the data that needs it, not only in `globalTeardown` — an
interrupted run (Ctrl-C, CI timeout, crashed worker) never reaches a global hook
and leaves orphans behind.

The suite also runs against a **shared public instance** that other people write
to concurrently, which rules out "the list contains exactly N items". Every
assertion is a property that survives foreign data: my record is present, a
filter never contradicts itself, the shape stays valid. That is the same
discipline a parallel suite needs against its own backend, where other workers
play the role of other people.

## Authorization matrix

| Operation | No token | Forged token | Valid token |
|---|---|---|---|
| GET | allow | allow | allow |
| POST | allow | allow | allow |
| PUT | **deny** | **deny** | allow |
| PATCH | **deny** | **deny** | allow |
| DELETE | **deny** | **deny** | allow |

The question each test answers is not "does the endpoint work" but "does it
refuse the people it should". A write endpoint that works perfectly for an
anonymous caller is working as designed and still a breach.

The positive row matters as much as the negatives: it proves the 403s are about
authorization and not a malformed request.

## Defects found in the target API

`tests/contract/api-defects.spec.ts` asserts each one **as it actually behaves**,
with a comment stating what the correct response would be.

| Defect | Actual | Correct |
|---|---|---|
| Successful DELETE | `201 Created` | `200` or `204` |
| `GET /ping` health check | `201 Created` | `200` |
| Failed authentication | `200` + `{reason}` | `401 Unauthorized` |
| Malformed booking id | `404` | `400` is more precise |

The reasoning for asserting reality rather than correctness: asserting the
correct behaviour leaves the suite permanently red, and a permanently red suite
stops being read. Deleting the case loses the knowledge. Asserting reality keeps
the run green, keeps the finding visible, and **fails loudly the day the API is
fixed** — which is exactly when the test should be revisited.

The `200`-on-failed-login case is the one with real consequences: anything that
checks only `response.ok` treats a rejected login as a successful one.

A contrast case is included so the spec is not merely a list of complaints —
`PUT` with a partial body correctly answers `400`, because PUT replaces the whole
resource.

## Hostile input

`describe.each` drives one body across empty strings, SQL-ish payloads, script
tags, 300-character values and Cyrillic text. The point is not that these find
anything, but that awkward input never produces a **5xx** — an unhandled
exception reaching the edge is both a bug and an information leak.

## Notes on the stack

**Jest is a runner with batteries**: runner, assertions, mocking, snapshots,
coverage and watch in one package. Mocha is only a runner and needs Chai and
Sinon bolted on. That difference is why both still exist.

`maxWorkers` parallelises at **file** level — each file gets its own worker
process, tests inside a file run sequentially. So a suite only scales if its
files are independent, which is the practical reason shared fixtures are banned
above.

`globalSetup` runs **once**, outside the workers, and probes the target first.
Without it an unreachable API produces thirty identical timeouts instead of one
clear message.

**Pactum** supplies the HTTP layer and the status expectation; **AJV** supplies
the contract check. Keeping them separate means a shape regression and a value
regression fail with different messages.
