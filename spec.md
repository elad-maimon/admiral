# Product Management System — Full Specification

## Overview

An internal product management system connecting business goals → product planning → execution.
Core entities: Initiatives → Epics → Deliverables, with monthly Lighthouse planning, a yearly Gantt roadmap, and team capacity management.

Design philosophy: Monday.com-style — inline editing, no dedicated detail pages per entity, fast and fluid.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + Auth + RLS) |
| Data fetching | Tanstack Query |
| Gantt | frappe-gantt or react-gantt-task (do NOT build custom SVG) |
| Charts | Recharts |
| Hosting | Vercel |

All backend logic lives in Next.js API Routes (`/api/v1/`). No separate backend service.

## Navigation (5 routes only)

```
/initiatives   — Initiative dashboard (default home)
/epics         — Epic list with inline deliverables
/lighthouse    — Monthly lighthouse (defaults to current month, month picker in header)
/roadmap       — Yearly Gantt (defaults to current year, year picker in header)
/teams         — Team & capacity management (team filter in header, no per-team pages)
```

---

## 1. Database Schema

Run tables in the order listed. All primary keys use `gen_random_uuid()`.

### Conventions
- **Week start:** always **Sunday**. Enforced at API layer.
- **Month boundary:** stored as **last day of the month** (e.g. `2025-03-31`). Used in `lighthouses.month` and `epics.target_date`.
- **Derived fields:** never stored. Computed at query time. See Section 4.

```sql
-- ─────────────────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────────────────

CREATE TABLE teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- PEOPLE
-- ─────────────────────────────────────────────────────────
-- team_id nullable: person with no team = "Org Level".
-- counts_toward_capacity: structural toggle, independent of unavailability.
--   Set FALSE to exclude from capacity calculations (e.g. non-eng roles).
-- role values: 'eng', 'product', 'manager', 'other' only.

CREATE TABLE people (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  email                   TEXT UNIQUE,
  role                    TEXT CHECK (role IN ('eng', 'product', 'manager', 'other')),
  team_id                 UUID REFERENCES teams(id) ON DELETE SET NULL,
  auth_user_id            UUID REFERENCES auth.users(id),
  permission              TEXT NOT NULL DEFAULT 'viewer'
                            CHECK (permission IN ('admin', 'member', 'viewer')),
  join_date   DATE,   -- NULL = already on team when system was set up
  leave_date  DATE,   -- NULL = still active
  counts_toward_capacity  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- PERSON UNAVAILABILITY
-- ─────────────────────────────────────────────────────────
-- One record = one week the person is OUT.
-- week_start is always a SUNDAY (enforced at app layer).
-- No record = available that week.
-- Independent of counts_toward_capacity.

CREATE TABLE person_unavailability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,  -- always Sunday
  reason      TEXT,
  UNIQUE(person_id, week_start)
);


-- ─────────────────────────────────────────────────────────
-- OKRs (standalone — not linked to initiatives yet)
-- ─────────────────────────────────────────────────────────

CREATE TABLE objectives (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id  UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  target_value  NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- INITIATIVES
-- ─────────────────────────────────────────────────────────
-- No status field — initiatives are always implicitly active.
--   Archive by deleting or use metadata if soft-delete is needed later.
-- No mandatory objective_id — OKRs are optional.
-- Team is DERIVED: owner.team_id. NULL → "Org Level".
-- Timeline DERIVED: MIN(deliverable.planned_week_start) / MAX(epic.target_date).
-- Progress DERIVED: weighted avg of epic progress by estimation.

CREATE TABLE initiatives (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  objective_id UUID REFERENCES objectives(id) ON DELETE SET NULL,
  owner_id     UUID NOT NULL REFERENCES people(id),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- EPICS
-- ─────────────────────────────────────────────────────────
-- planning_status: manually controlled.
--   scoping   = still being defined, may have no deliverables yet
--   active    = in execution
--   closed    = manually closed (independent of execution_status)
--   cancelled = explicitly stopped
--
-- execution_status: DERIVED from deliverables. Never stored. See Section 4.
-- planning_status='closed' and execution_status='done' are independent concepts:
--   planning_status='closed' = PM has manually signed off this epic
--   execution_status='done'  = all deliverables are marked done
--
-- importance: 1=Committed, 2=Strategic, 3=High, 4=Nice to Have, NULL=Unset
-- target_date: last day of target month (e.g. 2025-03-31)

CREATE TABLE epics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id    UUID NOT NULL REFERENCES initiatives(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT,
  owner_id         UUID REFERENCES people(id),
  planning_status  TEXT NOT NULL DEFAULT 'scoping'
                     CHECK (planning_status IN ('scoping', 'active', 'closed', 'cancelled')),
  importance       INT CHECK (importance IN (1, 2, 3, 4)),
  target_date      DATE,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- DELIVERABLES
-- ─────────────────────────────────────────────────────────
-- owner_id: the person responsible for this deliverable.
--   NOTE: lighthouse_items has its own feature_lead field which can override
--   this per-month. owner_id = default/permanent owner; feature_lead on
--   lighthouse_items = who is leading it in a specific month's plan.
--
-- planned_week_start: always a Sunday (enforced at app layer). User-set.
-- planned_week_end:   always a Sunday (enforced at app layer). User-set.
--                     Must be >= planned_week_start. Validated on write.
-- estimation_days: effort in working days. Can exceed the calendar week span
--   (e.g. 10d estimation, 1 week planned = 2 people working in parallel).
-- slip_count: incremented when removed from a committed lighthouse while
--   status != 'done'. Never decremented.
--
-- Status: backlog → ideation → rfd → in_dev → done
--                                           ↘ blocked
--                                           ↘ cancelled

CREATE TABLE deliverables (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id                UUID NOT NULL REFERENCES epics(id) ON DELETE CASCADE,
  title                  TEXT NOT NULL,
  description            TEXT,
  owner_id               UUID REFERENCES people(id),
  dod                    TEXT,
  status                 TEXT NOT NULL DEFAULT 'backlog'
                           CHECK (status IN ('backlog', 'ideation', 'rfd', 'in_dev',
                                             'done', 'blocked', 'cancelled')),
  estimation_days        NUMERIC,  -- effort in working days; implies team size when > span
  planned_week_start     DATE,     -- Sunday of start week (user sets)
  planned_week_end       DATE,     -- Sunday of end week (user sets, must be >= planned_week_start)
  actual_completion_date DATE,
  slip_count             INT NOT NULL DEFAULT 0,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- DELIVERABLE DEPENDENCIES
-- ─────────────────────────────────────────────────────────
-- A deliverable can depend on another deliverable OR on a milestone.
-- depends_on_entity_type: 'deliverable' | 'milestone'
-- depends_on_entity_id: UUID of the blocking deliverable or milestone.
-- Advisory only — warnings shown but saves never blocked.
-- No milestone_dependencies table: milestone linkage flows through here.
-- Milestone at-risk status is manually managed (no auto-derivation in this version).

CREATE TABLE deliverable_dependencies (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id          UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  depends_on_entity_type  TEXT NOT NULL
                            CHECK (depends_on_entity_type IN ('deliverable', 'milestone')),
  depends_on_entity_id    UUID NOT NULL,
  UNIQUE(deliverable_id, depends_on_entity_type, depends_on_entity_id),
  CHECK (
    NOT (depends_on_entity_type = 'deliverable'
         AND depends_on_entity_id = deliverable_id)
  )
);


-- ─────────────────────────────────────────────────────────
-- LIGHTHOUSES
-- ─────────────────────────────────────────────────────────
-- One per month, org-wide.
-- month: last day of the month (e.g. 2025-03-31).
-- draft → committed → closed
-- committed = locked; all item mutations return 409.

CREATE TABLE lighthouses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month       DATE NOT NULL UNIQUE,
  title       TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'committed', 'closed')),
  created_by  UUID REFERENCES people(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────
-- LIGHTHOUSE ITEMS
-- ─────────────────────────────────────────────────────────
-- feature_lead: who leads this item THIS month. Overrides deliverable.owner_id
--   for display in the lighthouse. NULL = fall back to deliverable.owner_id.
-- feature_team: array of person UUIDs. Not FK-enforced. Resolve at query time.
-- order_index: drag-reorder sort order. Lower = higher priority.
-- is_internal: TRUE = hidden from stakeholder share view and export.

CREATE TABLE lighthouse_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lighthouse_id  UUID NOT NULL REFERENCES lighthouses(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id),
  feature_lead   UUID REFERENCES people(id),
  feature_team   UUID[] DEFAULT '{}',
  order_index    INT DEFAULT 0,
  is_internal    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(lighthouse_id, deliverable_id)
);


-- ─────────────────────────────────────────────────────────
-- MILESTONES
-- ─────────────────────────────────────────────────────────
-- initiative_id nullable: NULL = org-level milestone.
-- status: manually managed. 'at_risk' is set by a human, not auto-derived
--   (no milestone_dependencies table in this version — add in Phase 3 if needed).
-- Rendered as flags on the Gantt.

CREATE TABLE milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id  UUID REFERENCES initiatives(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  date           DATE NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'upcoming'
                   CHECK (status IN ('upcoming', 'at_risk', 'hit', 'missed')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 2. API Design

Base: `/api/v1/`

**Rules:**
- Mutations return the full updated object.
- Lists support `?limit=&offset=`.
- `week_start` and `week_end` fields validated as Sundays on write; reject 400 if not.
- `planned_week_end` must be >= `planned_week_start`; reject 400 if not.
- Month fields validated as last-day-of-month on write; reject 400 if not.
- Lighthouse item mutations after `status = committed` return **409 Conflict**.

### Initiatives
```
GET    /initiatives              # ?team_id=
POST   /initiatives
GET    /initiatives/:id          # includes epics[] with derived fields
PATCH  /initiatives/:id
DELETE /initiatives/:id          # admin only
```

### Epics
```
GET    /epics                    # ?initiative_id= &team_id= &planning_status= &importance=
POST   /epics                    # body may include first_deliverable (creates both atomically)
GET    /epics/:id                # includes deliverables[] + all derived fields
PATCH  /epics/:id
DELETE /epics/:id                # admin only
```

### Deliverables
```
GET    /deliverables             # ?epic_id= &owner_id= &status= &week_start=
POST   /deliverables
GET    /deliverables/:id
PATCH  /deliverables/:id         # validates planned_week_end >= planned_week_start, rejects 400 if not
DELETE /deliverables/:id         # admin only

POST   /deliverables/:id/dependencies   # body: { depends_on_entity_type, depends_on_entity_id }
DELETE /deliverables/:id/dependencies/:depId
```

### Roadmap
```
GET    /roadmap/:year            # all deliverables + epics + milestones for the year
GET    /roadmap/:year?team_id=   # filtered to one team's initiatives
```

### Lighthouse
```
GET    /lighthouses              # list all months, descending
POST   /lighthouses              # body: { month, title }
GET    /lighthouses/:month       # e.g. /lighthouses/2025-03-31; includes items[]
PATCH  /lighthouses/:id          # status transitions: draft→committed, committed→closed

POST   /lighthouses/:id/items          # 409 if committed
                                       # body: { deliverable_id, order_index,
                                       #         is_internal, feature_lead, feature_team[] }
PATCH  /lighthouses/:id/items/:itemId  # 409 if committed
DELETE /lighthouses/:id/items/:itemId  # 409 if committed
                                       # side effect: if deliverable.status != 'done'
                                       #   → deliverable.slip_count++
```

### Teams & People
```
GET    /teams
POST   /teams
PATCH  /teams/:id
GET    /teams/:id/capacity?from=&to=   # weekly grid, computed

GET    /people                   # ?team_id=
POST   /people
PATCH  /people/:id               # includes counts_toward_capacity toggle

GET    /people/:id/unavailability        # ?from= &to=
POST   /people/:id/unavailability        # body: { week_start (Sunday), reason }
DELETE /people/:id/unavailability/:id
```

### OKRs
```
GET    /objectives
POST   /objectives
GET    /objectives/:id           # includes key_results[]
PATCH  /objectives/:id
DELETE /objectives/:id

POST   /objectives/:id/key-results
PATCH  /key-results/:id
DELETE /key-results/:id
```

### Milestones
```
GET    /milestones               # ?initiative_id= (omit → all incl. org-level)
POST   /milestones
PATCH  /milestones/:id
DELETE /milestones/:id
```

---

## 3. UX Screens

Design philosophy: Monday.com style. Inline editing everywhere. No separate detail pages.
Expand rows to see children. Edit in place. Modals only for create flows. Compact view, minimal scrolling.

---

### Screen 1: Initiative Dashboard (`/initiatives`)

**Purpose:** See all work grouped by team. No status filtering (initiatives have no status field).

**Header:**
- Filter: Team (dropdown)
- `+ New Initiative` button (top right)

**Layout:** Full-width list, grouped by team header, "Org Level" section at bottom.

```
▼ CORE PLATFORM
  ┌────────────────────────────────────────────────────────────────┐
  │ Auth Revamp          Dana    ████████░░  67%   Target: Apr 31 │
  │ 4/6 epics done  |  Committed (highest importance epic)        │
  └────────────────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────────────────┐
  │ Perf Optimization    Roy     ████░░░░░░  40%   Target: Jun 30 │
  └────────────────────────────────────────────────────────────────┘

▼ ORG LEVEL
  ┌────────────────────────────────────────────────────────────────┐
  │ Org-Level Infra      Alex    ██░░░░░░░░  20%   Target: Aug 31 │
  └────────────────────────────────────────────────────────────────┘
```

**Clicking a row** → expands inline to show its epic list:
```
  ▼ Auth Revamp
    ┌──────────────────────────────────────────────────────────────┐
    │ Login Flow Redesign  |  Dana  |  Committed  |  Mar 31       │
    │ ██████░░  3/4 deliverables  |  In Progress                  │
    ├──────────────────────────────────────────────────────────────┤
    │ Password Reset       |  Roy   |  Strategic  |  Apr 30       │
    │ ░░░░░░░░  0/1 deliverables  |  Scoping                      │
    └──────────────────────────────────────────────────────────────┘
    [+ Add Epic]
```

All fields editable inline (title, owner, target date).

---

### Screen 2: Epic List (`/epics`)

**Purpose:** Primary day-to-day execution view. Manage epics and their deliverables.

**Header:**
- Filters: Initiative (dropdown), Team (dropdown), Planning Status (dropdown), Importance (dropdown)
- `+ New Epic` button (top right)

**Key UX principle:** Most epics have ONE deliverable. `+ New Epic` opens a single combined form creating the epic and its first deliverable together atomically. Adding a second deliverable is the secondary path, via `+ Add Deliverable` inline.

**Layout:** Flat filterable list of epics.

```
Initiative       Epic                   Owner   Importance  Target   Progress      Status
───────────────────────────────────────────────────────────────────────────────────────────
Auth Revamp   ▶  Login Flow Redesign    Dana    Committed   Mar 31   ████░  75%    In Progress
Auth Revamp   ▶  Password Reset         Roy     Strategic   Apr 30   ░░░░░   0%    Scoping
Perf Opt      ▶  DB Query Optimization  Sam     High        May 31   ██░░░  40%    In Progress
```

**Expanding an epic row** → inline deliverable sub-table:

```
▼ Login Flow Redesign                                                   [+ Add Deliverable]
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ #  Title              Owner   Status       Est   Week Start   Week End    Slip   Dep     │
  │ 1  OAuth Integration  Sam     ✅ Done      5d    Sun Mar 2    Sun Mar 9   —      —       │
  │ 2  UI Mockups         Roy     ✅ Done      3d    Sun Mar 2    Sun Mar 9   —      —       │
  │ 3  API Endpoints      Sam     🔄 In Dev    4d    Sun Mar 9    Sun Mar 16  —      ⚠️ #4  │
  │ 4  E2E Tests          Sam     ⬜ Backlog   2d    Sun Mar 16   Sun Mar 23  1×     ⚠️ #3  │
  └──────────────────────────────────────────────────────────────────────────────────────────┘
```

- Every cell editable inline
- Status dropdown: backlog / ideation / rfd / in_dev / done / blocked / cancelled
- `slip_count > 0` → red badge "moved 1×"
- Dependency ⚠️ → tooltip: "Depends on [title] which is not yet done"
- Week Start and Week End pickers constrained to Sundays only

---

### Screen 3: Lighthouse (`/lighthouse`)

**Purpose:** Monthly commitment planning and stakeholder communication.

**Header:**
- Month picker (defaults to current month)
- Status badge: Draft / Committed / Closed
- `Commit` button (admin only; disabled after commit)
- `Share` button — copies read-only stakeholder URL
- `Export` button — generates clean image/PDF (non-internal items only)
- Toggle: **Edit mode** | **Stakeholder view**

**Carry-over banner** (shown on new draft when previous month had incomplete items):
```
⚠️  2 items not completed in February.  [Review & add to this month →]
```

**Main table:**
```
#  │ Deliverable           │ Feature Lead │ Feature Team    │ Status    │ 🔒
───┼───────────────────────┼──────────────┼─────────────────┼───────────┼────
1  │ OAuth Integration     │ Dana         │ Sam, Roy        │ ✅ Done   │ □
2  │ Payment Retry Logic   │ Sam          │ Alex            │ 🔄 In Dev │ □
3  │ Dashboard V2          │ Roy          │ —               │ ⬜ RFD    │ ☑  ← hidden in stakeholder view
4  │ API Rate Limiting     │ Alex         │ —               │ 🔄 In Dev │ □
```

- Rows drag-reorderable (sets `order_index`)
- `Feature Lead` overrides `deliverable.owner_id` for this month's plan; NULL = inherit
- `Feature Team`: multi-person picker
- `Status` is live (read from deliverable.status); edit status on /epics screen
- 🔒 = `is_internal` toggle
- `+ Add Deliverable` → search modal across all deliverables

**Footer:**
```
Completion: 1/4  (25%)   |   Internal: 1 item hidden   |   Slippage from Feb: 2 items
```

**Stakeholder view** (`?view=stakeholder` — no auth required):
- Internal items hidden, no edit controls, no 🔒 column

---

### Screen 4: Roadmap (`/roadmap`)

**Purpose:** Yearly Gantt across all teams.

**Header:**
- Year picker (defaults to current year)
- Filter: Team (dropdown)
- Toggle: Deliverables | Epics only

**Layout:**
```
                    │ W1    W2    W3    W4    W5    W6    W7    W8 ...
                    │              ░░░░░░                             ← red/amber column = team over-capacity
────────────────────┼───────────────────────────────────────────────────
CORE PLATFORM       │              ░░░░░░
  Auth Revamp       │        [══OAuth══][══UI══]
                    │               [═══API═══════]
                    │                      [═E2E═]  🚩 Launch
  Perf Opt          │  [════════DB Opt════════]
────────────────────┼───────────────────────────────────────────────────
ORG LEVEL           │
  Org-Level Infra   │  [══════Rate Limiting═══════]
```

**Bar encoding:**
- Width = `planned_week_end − planned_week_start` (user-defined span)
- Height = derived from implied_people — 3 levels:
  - small: 1 person implied
  - medium: 2 people implied
  - large: 3+ people implied
  - implied_people = CEIL(estimation_days / span_working_days)
- Color = epic hue (deliverables within same epic = shades of that hue)
- Red outline = delayed (`status != 'done'` AND `today > planned_week_end`)
- Gray bar behind = original planned position when dates shifted
- Dependency arrows between deliverables; dashed red if unmet

**Team over-capacity column bands:**
- When `team_assigned > team_capacity` for a given week, that week column is highlighted
  with a red/amber tint across the full swimlane height of that team's section.
- Visible at a glance which weeks have a resource crunch without pointing at individuals.

**Milestones:**
- 🚩 flag at `milestone.date`; red/orange if `status = at_risk`
- Click → popover: title, status, description

**Interactions:**
- Hover → tooltip with title, owner, status, estimate, dates, implied team size
- Click → slide-in edit panel (not a new page)

**Swimlane layout:**
- Team column on left: narrow, rotated text
- Initiative swimlanes nested within each team section
- Epics within same initiative share the same color family

---

### Screen 5: Team & Capacity (`/teams`)

**Purpose:** Team composition, weekly capacity vs assigned work.

**Header:**
- Team filter (dropdown: "All Teams" or one team)
- Date range (defaults to current month + 2 months)
- `+ Add Person` button

**Weekly capacity grid:**
```
Member     Role     W1 Mar   W2 Mar   W3 Mar   W4 Mar   W1 Apr ...
──────────────────────────────────────────────────────────────────
Dana       Manager  2d       0d       🏖 OUT   1d
Sam        Eng      5d       8d       4d       🏖 OUT
Roy        Eng      4d       2d       3d       3d
──────────────────────────────────────────────────────────────────
Team Total          ✅ 11d   ⚠️ 18d  ✅ 7d    ✅ 4d
Capacity            15d      15d      10d      10d
```

- Person rows show assigned day counts per week — informational only, no per-person alerts
- 🏖 = unavailability record that week (click to remove)
- ⚠️ on **Team Total row only** when team_assigned > team_capacity for that week
- Clicking any person cell → tooltip listing which deliverables are assigned that week
- `counts_toward_capacity = FALSE` → row muted, excluded from Team Total

**People panel** (below grid):
- Toggle `counts_toward_capacity` inline
- `+ Vacation week` → Sunday-constrained week picker
- Join/leave dates shown as annotations

---

## 4. Core Logic

### Team Size Implication (display only, not stored)

```
span_days      = working days between planned_week_start and planned_week_end
implied_people = CEIL(estimation_days / span_days)

Show in tooltip/detail: "~2 people needed" when implied_people > 1.
Used for Gantt bar height only (see Roadmap screen).
```

---

### Epic Execution Status (derived, never stored)

Note: must activate epic (planning_status = 'active') to start executing its deliverables.

```
Evaluate in this order using deliverables WHERE status != 'cancelled':

if COUNT(deliverables) == 0
  OR ALL status == 'backlog'                                              → 'not_started'
if ANY status == 'ideation' AND rest IN ('backlog')                      → 'ideation'
if ANY status == 'rfd'      AND rest IN ('backlog', 'ideation')          → 'rfd'
if ANY status == 'in_dev'   AND rest IN ('backlog', 'ideation', 'rfd')   → 'in_progress'
if ALL status == 'done'     (ignoring 'cancelled')                       → 'done'
if ALL status == 'cancelled'                                             → 'cancelled'
if ANY status == 'blocked'                                               → 'blocked'
```

---

### Progress Calculation

```
# By count (label: "X/Y")
completed_count = COUNT(deliverables WHERE status = 'done')
total_count     = COUNT(deliverables WHERE status != 'cancelled')

# By estimation (progress bar fill)
completed_est   = SUM(estimation_days WHERE status = 'done')
total_est       = SUM(estimation_days WHERE status != 'cancelled')
progress_est    = completed_est / total_est × 100

# Initiative = weighted avg of epic progress_est, weighted by epic total_est
initiative_pct  = SUM(epic.progress_est × epic.total_est) / SUM(epic.total_est)
```

---

### Delay Calculation

```
For a deliverable:
  if status != 'done' AND today > planned_week_end:
    delay_days  = today − planned_week_end
    delay_weeks = CEIL(delay_days / 7)        ← display "X weeks late"

  if status == 'done' AND actual_completion_date > planned_week_end:
    delay_days  = actual_completion_date − planned_week_end

For an epic:     delay_days = MAX(child deliverable delay_days)
For initiative:  no need to manage delays at initiative level
```

---

### Lighthouse Logic

```
LIFECYCLE:
  1. Members create Lighthouse for a month  → status = 'draft'
     Title auto-set to "March Lighthouse" (editable)
  2. Members add deliverables to the lighthouse
  3. Members curate: drag order_index, set is_internal, set feature_lead/feature_team
  4. Admin commits  → status = 'committed'
       - All lighthouse_items mutations return 409 from this point (unless reopened by admin)
       - lighthouse_items snapshot IS the committed plan (historical record)
  5. Deliverable statuses update freely throughout the month
  6. Admin closes at month end  → status = 'closed'

SLIP HANDLING on DELETE item from a committed lighthouse:
  if deliverable.status != 'done':
    deliverable.slip_count += 1

CARRY-OVER on new draft creation:
  prev_committed = most recent lighthouse WHERE status IN ('committed', 'closed')
  carry_overs    = its items WHERE deliverable.status NOT IN ('done', 'cancelled')
  → Banner: "N items not completed in [Month]. [Review & add →]"

METRICS (after close):
  completion_rate = COUNT(done items) / COUNT(all items)
  slippage_count  = COUNT(not-done items)
```

---

### Capacity Calculation (weekly)

```
For person P, week W (week_start = Sunday):
  is_active      = (leave_date IS NULL OR leave_date > W.week_start)
  is_available   = is_active AND no person_unavailability WHERE week_start = W
  available_days = (is_available AND counts_toward_capacity) ? 5 : 0
  assigned_days  = SUM(deliverables.estimation_days
                       WHERE owner_id = P AND planned_week_start = W)

Team capacity (week W):
  team_capacity = SUM(available_days) for all active team members
  team_assigned = SUM(estimation_days) for all deliverables planned in week W
                  owned by active team members
  team_over_capacity = team_assigned > team_capacity
```

---

### Dependency Warning Logic (advisory — never blocks saves)

```
For deliverable D with dependency on entity B:

  B is deliverable:
    warn = B.status != 'done' AND D.planned_week_start <= B.planned_week_end

  B is milestone:
    warn = B.status NOT IN ('hit') AND D.planned_week_start <= B.date

  if warn:
    → ⚠️ badge on deliverable row (/epics)
    → Dashed red arrow on Gantt (/roadmap)
    → Tooltip: "Depends on [B.title] which is not yet complete"
```

---

### Milestone Status

Milestone status is **manually managed** by admins. No auto-derivation in this version (no `milestone_dependencies` table yet). Admins set status to `at_risk`, `hit`, or `missed` directly.

Auto-derivation via a `milestone_dependencies` table is a planned Phase 3 addition.

---

## 5. Permissions (Supabase RLS)

```
admin:
  Full CRUD on all tables.
  Commit and close lighthouses.
  Toggle counts_toward_capacity.
  Delete initiatives, epics, deliverables.

member:
  Create and edit epics and deliverables.
  Update deliverable status, dates, estimation, owner_id.
  Add/remove/reorder lighthouse items (draft only).
  Cannot commit or close lighthouses.
  Cannot delete initiatives.

viewer:
  Read-only on all tables.

Stakeholder URL (/lighthouse?month=2025-03-31&view=stakeholder):
  No auth required.
  Filters: lighthouse_items WHERE is_internal = FALSE.
  Read-only, no edit controls.
```

RLS: role in `people.permission`, joined via `auth.uid()` → `people.auth_user_id`.

---

## 6. Seed Data

```
TEAMS
  "רום"
  "מפעל המידע"
  "אקו-סיסטם"

PEOPLE
  אלעד מימון  | manager | No team | admin  | counts_toward_capacity: false
  נופר דביר  | manager | No team | admin  | counts_toward_capacity: false
  בידי אלקיים   | manager     | רום | member | counts_toward_capacity: false
  קארן יצחק   | eng     | רום | member | counts_toward_capacity: true
  גיא אביסרור   | eng     | רום | member | counts_toward_capacity: true
  עינת לוי  | product | רום        | member | counts_toward_capacity: false
  שקד אלון   | manager     | מפעל המידע | member | counts_toward_capacity: false
  דניאל לנדאו   | eng     | מפעל המידע | member | counts_toward_capacity: true
  אושר יוסף   | eng     | מפעל המידע | member | counts_toward_capacity: true
  נועם ריזה  | product | מפעל המידע  | member | counts_toward_capacity: false
  אורי צדיקריו   | eng     | אקו-סיסטם | member | counts_toward_capacity: true
  ליבי ספנסר   | eng     | אקו-סיסטם | member | counts_toward_capacity: true
  יותם אמרגי  | product | אקו-סיסטם  | member | counts_toward_capacity: false

OBJECTIVES (standalone — not linked to initiatives)
  "לאפשר הפעלה נרחבת של אמצעים ויכולות ברוק״ק לאגבור יכולת הפעולה של כלל מפעילי הכח"
  "לסנכרן הפעלת אמצעים מוטסים ברוק״ק עם אש מהקרקע (תמ״ס והגנ״א) ועם לוחמה אלקטרונית, תוך צמצום ההפרעה ההדדית"
  "להפעיל, לתאם ולסנכרן יכולות הגנה כנגד איומים אויריים המופעלים כנגד תשתיות, כוחות היבשה בתמרון ובגבולות"

INITIATIVES
  "עוקב והיתוך"                  | Owner: אלעד
  "dev happiness"                | Owner: אלעד
  "המלצות אוטומטיות"             | Owner: אלעד
  "הטמעות"                       | Owner: בר
  "קשרי לקוחות"                  | Owner: בר
  "ניהול ותכנון מרשמי טיסה"      | Owner: יותם
  "סימולטור"                     | Owner: יותם
  "ניהול תשתיות שמיים ברוק״ק"    | Owner: יותם
  "העשרת מקורות גילוי"           | Owner: נועם
  "חיבור רב-ארגוני"              | Owner: נועם
  "הרמטיות ותקינת מידע"          | Owner: נועם
  "מאגר כמוצר"                   | Owner: נועם
  "הרחבת מפעל המידע"             | Owner: נועם
  "הנגשות מאגר"                  | Owner: נועם
  "מידור והרשאות"                | Owner: נועם
  "היסטוריית מידע"               | Owner: נועם
  "רציפות, שרידות וביצועים"      | Owner: נופר
  "תחקור טכנו-מבצעי"             | Owner: נופר
  "מחקר ביצועים"                 | Owner: נופר
  "תחקור מבצעי"                  | Owner: נופר
  "תמונה מודיעינית"              | Owner: עינת
  "ניהול צד כחול"                | Owner: עינת
  "תמונ״ש ברוק״ק (רום)"          | Owner: עינת
  "ניהול סנסורים"                | Owner: עינת
  "הפצה וניהול תמונ״ש בלומ״ר"    | Owner: עינת
  "ניהול אירועי רוק״ק"           | Owner: עינת
  "פו״ש ודגלים"                  | Owner: עינת
  "התרעות משתמש"                 | Owner: עינת

EPICS (under עוקב והיתוך)
  "Login Flow Redesign" | importance: 1 | planning_status: active
                        | target_date: last day of current month + 1
  "Password Reset"      | importance: 2 | planning_status: scoping
                        | target_date: last day of current month + 2

DELIVERABLES (under הטמעות)
  "OAuth Integration" | owner: Sam | status: done    | est: 5d
                      | planned_week_start: Sunday 2 weeks ago
                      | planned_week_end:   Sunday 1 week ago
                      | actual_completion_date: last Sunday
  "UI Mockups"        | owner: Roy | status: done    | est: 3d
                      | planned_week_start: Sunday 2 weeks ago
                      | planned_week_end:   Sunday 1 week ago
  "API Endpoints"     | owner: Sam | status: in_dev  | est: 4d
                      | planned_week_start: this Sunday
                      | planned_week_end:   next Sunday
  "E2E Tests"         | owner: Sam | status: backlog | est: 2d
                      | planned_week_start: next Sunday
                      | planned_week_end:   Sunday after next

DELIVERABLE DEPENDENCY
  "E2E Tests" depends_on "API Endpoints" (type: 'deliverable')
  → ⚠️ warning: E2E starts before API Endpoints is done

LIGHTHOUSE
  month: last day of current month | status: draft
  items:
    { deliverable: "API Endpoints", order_index: 0, is_internal: false, feature_lead: Sam }
    { deliverable: "E2E Tests",     order_index: 1, is_internal: false, feature_lead: Sam }

PERSON UNAVAILABILITY
  Sam | week_start: Sunday two weeks from now

MILESTONE
  "Auth v2 Launch" | initiative: Auth Revamp
                   | date: last day of current month + 1 month
                   | status: upcoming
```

---

## 7. MVP Build Order

### Phase 1 — Core (Weeks 1–3)

```
1. Supabase
   - Run schema SQL (table order from Section 1)
   - Seed data script
   - Auth + 3-role RLS policies

2. Next.js bootstrap
   - next@14, typescript, tailwind, shadcn/ui, tanstack-query, supabase-js
   - 5-route navigation shell

3. /initiatives
   - Grouped by team + Org Level
   - Inline epic expansion
   - Progress bars by estimation
   - Inline field editing

4. /epics
   - Flat filterable list
   - Combined epic + first deliverable creation form (POST /epics with first_deliverable)
   - Inline deliverable sub-table with Week Start + Week End columns
   - Status editing, slip badge, dependency warning

5. /lighthouse
   - Month picker, draft creation, carry-over banner
   - Drag-reorder (order_index)
   - Commit + 409 lock enforcement
   - is_internal toggle
   - Stakeholder share URL
```

### Phase 2 — Planning (Weeks 4–5)

```
6. /roadmap
   - Week-resolution timeline, initiative swimlanes
     (epics within same initiative = same color family)
   - Team swimlane headers: narrow column, rotated text
   - frappe-gantt or react-gantt-task
   - Bar height from implied_people, epic color grouping
   - Team over-capacity week column highlighting (red/amber band per team section)
   - Milestone flags
   - Dependency arrows (dashed red if unmet)

7. /teams
   - Weekly capacity grid
   - Over-capacity on Team Total row only
   - Unavailability management (Sunday-constrained week picker)
   - counts_toward_capacity toggle

8. Delay badges
   - "X weeks late" on /epics deliverable rows
   - Bubble up to epic level
```

### Phase 3 — Polish (Week 6+)

```
9.  OKR screens (objectives + key results, standalone section)
10. Lighthouse export (styled image/PDF, non-internal only)
11. milestone_dependencies table + auto at-risk derivation
12. Lighthouse slip carry-over UX polish
```

### Defer entirely

- Real-time collaboration
- Notifications
- Jira / Linear / Slack integrations
- Team-scoped lighthouses
- Co-ownership / initiative_members
- Full audit log

---

## 8. Implementation Notes

```
DERIVED FIELDS
  Never store: epic execution_status, initiative progress.
  Compute via SQL CTEs or at API layer on each read.
  Materialized views only when queries degrade.

EPIC + DELIVERABLE ATOMIC CREATION
  POST /epics accepts optional `first_deliverable` in body.
  Create both in a single DB transaction if present.
  This is the default create flow.

LIGHTHOUSE LOCK
  After lighthouse.status = 'committed':
    POST/PATCH/DELETE on /lighthouses/:id/items →
    HTTP 409 { "error": "Lighthouse is committed and locked." }

STAKEHOLDER URL
  /lighthouse?month=YYYY-MM-DD&view=stakeholder
  No auth. Filters is_internal = FALSE. Read-only UI.

WEEK VALIDATION
  week_start and week_end must be Sundays.
  Postgres: EXTRACT(DOW FROM value) = 0
  Reject non-Sundays with HTTP 400.
  planned_week_end must be >= planned_week_start; reject 400 if not.

MONTH VALIDATION
  month / target_date must be last day of its month.
  Reject others with HTTP 400.

FEATURE LEAD FALLBACK (Lighthouse display)
  lighthouse_items.feature_lead IS NOT NULL → use it
  else → fall back to deliverables.owner_id

PLANNING_STATUS vs EXECUTION_STATUS (epics)
  planning_status = manually set by PM ('scoping', 'active', 'closed', 'cancelled')
  execution_status = derived from deliverables (never stored)
  Both shown in UI together. They can disagree (e.g. planning_status='closed'
  but one deliverable still in_dev — show both without resolving the conflict).

MILESTONE AT-RISK (this version)
  Manually managed by admin. No auto-derivation.
  Phase 3 adds milestone_dependencies table and auto-derivation.

IMPORTANCE DISPLAY MAP  (config/constants.ts)
  1 → "Committed"
  2 → "Strategic"
  3 → "High"
  4 → "Nice to Have"
  null → "" (unset)

METADATA ESCAPE HATCH
  initiatives, epics, deliverables each have metadata JSONB DEFAULT '{}'.
  Use for ad-hoc fields before committing to schema migrations.

GANTT LIBRARY
  frappe-gantt preferred. Do not build custom SVG. Build last in Phase 2.
```

---

## 9. Localization & RTL

- App is fully RTL. Set `dir="rtl"` on the root `<html>` element.
- Use Tailwind's RTL variants where needed (`rtl:` prefix) or a plugin like `tailwindcss-rtl`.
- Font: use `Noto Sans Hebrew` or `Assistant` (both free on Google Fonts,
  excellent Hebrew rendering).

LANGUAGE RULES:
  - UI language is Hebrew.
  - The following terms stay in English (no translation):
      Epic, Deliverable, Lighthouse, Initiative, Roadmap, Backlog, RFD, Feature Lead, Feature Team, Owner, DoD, Active, Scoping, Cancelled, Closed, Blocked, In Dev, Done, Capacity
  - Everything else is Hebrew. Examples:
      Team       → צוות
      People     → אנשים
      Status     → סטטוס
      Committed  → התחייבות
      Strategic  → אסטרטגי
      High       → גבוה
      Planned    → מתוכנן
      Target     → יעד
      Delay      → עיכוב
      Week       → שבוע
      Month      → חודש
      Progress   → התקדמות
      Save       → שמור
      Cancel     → ביטול
      Add        → הוסף
      Edit       → ערוך
      Delete     → מחק
      Share      → שתף
      Export     → ייצוא
      Commit     → אשר
      Search     → חיפוש

  Store all display strings in a single `lib/i18n.ts` constants file.
  Keep also the terms that stay in English in the same file with the English value.
  Do not hardcode Hebrew strings in components — always import from i18n.ts.
  This makes future edits easy without hunting through components.
