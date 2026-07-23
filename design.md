# Slot Booking System — Design Document

Stack: NestJS + TypeORM + PostgreSQL. Auth: JWT (custom guard, not Passport).

---

## 1. Database & System Design

### Entities

**User** (`users`)
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK, default `uuid_generate_v4()` |
| firstName | varchar | not null |
| lastName | varchar | not null |
| email | varchar | not null, **unique** |
| password | varchar | not null (bcrypt hash, 10 rounds) |
| roleId | uuid | FK → `roles.id`, not null, `ON DELETE NO ACTION` |
| createdAt / updatedAt | timestamp | default `now()` |

**Role** (`roles`)
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| roleName | varchar | not null, **unique** |
| roleDescription | varchar | nullable |
| createdAt | timestamp | default `now()` |

**Service** (`services`)
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| name | varchar | not null |
| duration | int | not null (minutes) |
| price | decimal(10,2) | not null |
| ownerId | uuid | FK → `users.id`, not null, **`ON DELETE CASCADE`** |
| createdAt / updatedAt | timestamp | default `now()` |

**Availability** (`availabilities`) — a recurring weekly template, not a dated instance
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| ownerId | uuid | FK → `users.id`, not null, **`ON DELETE CASCADE`** |
| dayOfWeek | enum (`MONDAY`…`SUNDAY`) | not null, real Postgres enum type |
| startTime | time | not null |
| endTime | time | not null |
| createdAt / updatedAt | timestamp | default `now()` |

**Booking** (`bookings`) — a concrete, dated instance
| Field | Type | Constraints |
|---|---|---|
| id | uuid | PK |
| userId | uuid | FK → `users.id` (the customer), not null, **`ON DELETE NO ACTION`** |
| serviceId | uuid | FK → `services.id`, not null, **`ON DELETE NO ACTION`** |
| slotStartTime | timestamp | not null |
| slotEndTime | timestamp | not null |
| status | enum (`BOOKED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`) | not null, default `BOOKED`, real Postgres enum type |
| createdAt / updatedAt | timestamp | default `now()` |

### Relationships
```
Role  1───* User  1───* Service  1───* Booking *───1 User (customer)
                  1───* Availability
```
`Booking` has two independent FKs to `User` (owner, via `Service`) and to the customer directly — it does **not** have a direct FK to `Availability`.

### Design decisions

- **Role is its own table, not a hardcoded enum on `User`.** Lets roles be added/described without a migration. Trade-off: `roleName` itself is a plain unique varchar, not a DB-level enum — nothing stops a typo'd role from being inserted directly via SQL. Mitigated in code by making the role-check case-insensitive (see §3), but this is a real, acknowledged gap versus a hard DB constraint.
- **`Availability` and `Booking` are separate entities.** `Availability` models "this owner is open Mondays 9–5" as a recurring template; `Booking` models "this customer has 9:00–9:30 on July 27th." Collapsing them would mean generating and storing a row for every future week of every recurring slot, which doesn't scale and complicates edits (change one weekly slot vs. rewriting hundreds of future rows).
- **`time` vs `timestamp`.** `Availability.startTime/endTime` are `time` (no date) because they're a weekly pattern; `Booking.slotStartTime/slotEndTime` are `timestamp` because they're one concrete, dated event.
- **`Booking.status` is an enum with three terminal states**, not a single `isCancelled` boolean — this lets the system distinguish a customer no-show from a cancellation from a normal completion, which the business logic (see §3) actually branches on.
- **FK cascade behavior is deliberately asymmetric:**
  - `Service`/`Availability` → `User` is `ON DELETE CASCADE`: if an owner's account is removed, their own offerings and schedule go with it.
  - `Booking` → `User`/`Service` is `ON DELETE NO ACTION` (i.e., restrict): a booking is a historical record — you cannot delete a customer or a service out from under an existing booking. The database physically refuses it; the application layer translates that into a clean `409` for `Service` deletion (see §3, gap #5) rather than exposing it as a raw error to the API layer.
- **No soft-delete columns anywhere.** Every delete is a hard delete, protected only where integrity actually requires it (bookings referencing users/services). Kept intentionally simple rather than adding an `isDeleted` flag with no clear consumer yet.

### Known gap
`Users` and `Roles` do not yet have real CRUD — those controllers/services are still the original Nest-scaffold stubs (return hardcoded strings, no repository wired up). Roles are currently seeded directly via SQL. This is out of scope of what's been built so far, not a bug in what exists.

---

## 2. API Design

Global: `class-validator` `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`) rejects malformed/extra fields on every route before it reaches a controller.

| Method | Path | Role | Responsibility |
|---|---|---|---|
| POST | `/auth/register` | public | Create a `User` (hashes password, resolves `roleName` → `roleId`) |
| POST | `/auth/login` | public | Verify credentials, issue JWT |
| POST | `/services` | **Owner** | Create a service (name, duration, price) owned by the caller |
| GET | `/services/my` | **Owner** | List the caller's own services (management view) |
| GET | `/services/browse` | **Customer** | List *all* services across all owners, each with the owner's name and weekly availability attached — the discovery/booking view |
| GET | `/services/:id` | public | Fetch one service |
| PATCH | `/services/:id` | **Owner**, must be the owner | Update name/duration/price |
| DELETE | `/services/:id` | **Owner**, must be the owner | Delete; rejected with `409` if bookings reference it |
| POST | `/availability` | **Owner** | Create a recurring weekly slot |
| GET | `/availability` | **Owner** | List the caller's own slots |
| GET | `/availability/:id` | public | Fetch one slot |
| PATCH | `/availability/:id` | **Owner**, must be the owner | Update a slot (re-validates overlap rules) |
| DELETE | `/availability/:id` | **Owner**, must be the owner | Delete a slot |
| POST | `/bookings` | **Customer** | Book a specific dated slot against a service |
| GET | `/bookings` | any authenticated user | Customer → own bookings; Owner → bookings against their services |
| GET | `/bookings/:id` | caller must be the customer on it or the owning Owner | Fetch one booking |
| PATCH | `/bookings/:id` | see below | Change `status` only — no reschedule endpoint |

Role separation is enforced by a global `AuthGuard` (validates the JWT, attaches the decoded payload as `request.user`) plus a per-route `RoleGuard` reading a `@Roles(...)` decorator. Routes with no `@Roles(...)` just require *any* authenticated user; the owner/customer distinction inside those (`GET /bookings`, `PATCH /bookings/:id`) is then enforced in the service layer by comparing `request.user.id` against the resource's `ownerId`/`userId`.

There is intentionally **no `DELETE /bookings/:id`** — cancellation goes through `PATCH .../status = CANCELLED` so the record (and history) is preserved rather than removed.

---

## 3. Edge Case Identification & Handling

| # | Edge case | Identified | Enforced in code | Where / how |
|---|---|---|---|---|
| 1 | Double-booking the same slot | Yes | Yes | `BookingsService.create` queries existing `BOOKED` bookings for the same owner where `slotStartTime < newEnd AND slotEndTime > newStart` → `409 Conflict` |
| 2 | Two customers booking the same slot **simultaneously** (race condition) | Yes | Yes | The conflict check + insert run inside one DB transaction guarded by `pg_advisory_xact_lock(hashtext(ownerId))` — a second concurrent request for the same owner blocks until the first transaction commits, so it always sees the just-created row. Verified live by firing two literally-simultaneous requests for the same slot: one `201`, one `409`, and confirmed only one row exists in the DB afterward. |
| 3 | Booking outside business hours or on an unavailable day | Yes | Yes | Requested slot's day-of-week + time-of-day (in minutes) must fall fully inside one of the owner's `Availability` rows for that day, else `400`. *Limitation:* Availability is a recurring weekly template with no per-date overrides — there's no way yet to mark a single date as a holiday/closed while keeping the weekly pattern otherwise intact. |
| 4 | Cancellation rules — can a customer cancel a completed/no-show booking? | Yes | Yes | `BookingsService.update` blocks **any** status change once a booking is `CANCELLED`, `COMPLETED`, or `NO_SHOW` (`400`). Additionally, a customer (non-owner) may only ever set `status: CANCELLED` on their own booking — setting `COMPLETED`/`NO_SHOW` is Owner-only (`403` otherwise). |
| 5 | Service or availability deleted while active bookings exist | Partially | Service: Yes. Availability: No (by design) | Deleting a `Service` with existing bookings is rejected by the DB FK (`ON DELETE NO ACTION`); the app catches the constraint violation and returns a clean `409` instead of leaking a raw `500`. Deleting an `Availability` row is **not** blocked — there is no FK from `Booking` to `Availability` (a booking stores its own concrete `slotStartTime`/`slotEndTime`, independent of the weekly template it was validated against at creation time), so removing the template doesn't orphan or invalidate any existing booking. This was a deliberate simplification, flagged here rather than silently assumed — worth revisiting if "warn/block if future bookings depend on this window" becomes a requirement. |
| 6 | Invalid date ranges, past dates, malformed input | Yes | Yes | `slotEndTime <= slotStartTime` → `400`; `slotStartTime` in the past → `400`; requested duration must exactly equal the service's `duration` → `400`; all date-times validated as ISO 8601 and all UUIDs (path params and DTO foreign keys) validated via `ParseUUIDPipe`/`@IsUUID` → `400`. |
| 7 | Owner attempting to access another owner's bookings or services | Yes | Yes | `ForbiddenException` (`403`) on cross-owner `update`/`remove` for both `Service` and `Availability`, and on viewing another owner's `Booking` via `findOne`. List endpoints (`/services/my`, `/availability`, `/bookings`) are scoped by `ownerId`/`userId` in the query itself, so nothing leaks through listing either. Verified live with two separate registered Owner accounts. |

### Also enforced, not explicitly asked but directly relevant
- Duplicate/overlapping `Availability` slots for the same owner+day are rejected the same way double-booked `Booking`s are (`409`).
- Duplicate service name per owner is rejected (`409`); global uniqueness isn't required, only per-owner.
- Role name comparison (`RoleGuard`) is case-insensitive, closing a real bug found during testing where a DB role stored as `CUSTOMER` never matched a decorator written as `@Roles('Customer')`.
