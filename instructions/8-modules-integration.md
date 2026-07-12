# 8 — Module Integration Map (Frontend ↔ Backend ↔ Database)

This file maps every non-auth screen to its exact DB tables/columns and API endpoints, so integration work can run in parallel without either teammate guessing at field names or endpoint shapes. Auth/login/session (Screen 1) is explicitly out of scope here — that's covered by files 4 and 7 and is being handled separately.

## Split

| Teammate | Modules |
|---|---|
| **Teammate A (odd)** | 1. Dashboard · 3. Asset Registration & Directory · 5. Resource Booking · 7. Asset Audit · 9. Notifications & Activity Log |
| **Teammate B (even)** | 2. Organization Setup · 4. Asset Allocation & Transfer · 6. Maintenance Management · 8. Reports & Analytics |

Numbering here is "module number," not the mockup's "Screen N" — mapping is 1:1 shifted by one (Module 1 = Screen 2 in the problem statement, since Screen 1/login is excluded). Kept the mapping table below so nobody has to do the arithmetic mid-integration:

| Module # (this file) | Screen # (mockup / problem statement) |
|---|---|
| 1 | Screen 2 — Dashboard |
| 2 | Screen 3 — Organization Setup |
| 3 | Screen 4 — Asset Registration & Directory |
| 4 | Screen 5 — Asset Allocation & Transfer |
| 5 | Screen 6 — Resource Booking |
| 6 | Screen 7 — Maintenance Management |
| 7 | Screen 8 — Asset Audit |
| 8 | Screen 9 — Reports & Analytics |
| 9 | Screen 10 — Activity Logs & Notifications |

## How to read each module's section

- **Tables/columns**: exact DB objects touched, taken from the live schema you pasted in (matches `supabase/migrations/0001`–`0010`).
- **Endpoints**: from `6-backend-implementations.md`, with request/response shape spelled out so a frontend component can be wired without opening the route file.
- **Frontend wiring**: which component (from `2-ui-reference.md`) calls which endpoint, and what loading/empty/error states to handle.
- **Gotchas**: anything that will break integration if assumed wrong (enum casing, nullable FKs, etc.)

All list endpoints share the pagination/sort contract from `3-database-schema.md` Section "Backend search/sort/filter API implementation pattern": query params `q`, `sortBy`, `sortDir`, `page`, `pageSize`, response shape `{ data, count, page, pageSize }`. Not repeated per-module below except where a module deviates.

---
---

# TEAMMATE A — Odd Modules

---

## Module 1 — Dashboard (Screen 2)

### Tables/columns touched (read-only aggregates, no writes from this screen)
- `assets.status` — counts for Available/Allocated KPI cards
- `allocations.status`, `allocations.expected_return_date` — Active count, overdue detection
- `resource_bookings.status`, `resource_bookings.starts_at` — Active Bookings, Upcoming Returns-adjacent
- `transfer_requests.status = 'Requested'` — Pending Transfers count
- `activity_log` — Recent Activity feed (last 5–10 rows)

### Endpoint: `GET /api/dashboard/summary`
**Not yet built in file 6** — file 6 covered per-module CRUD but not this aggregate. Add this route now:

```typescript
// src/app/api/dashboard/summary/route.ts
import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server-auth';
import { apiError } from '@/lib/api-response';

export async function GET() {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const [available, allocated, reserved, activeBookings, pendingTransfers, overdue, recentActivity] = await Promise.all([
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Available'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Allocated'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'Reserved'),
    supabase.from('resource_bookings').select('id', { count: 'exact', head: true }).in('status', ['Upcoming', 'Ongoing']),
    supabase.from('transfer_requests').select('id', { count: 'exact', head: true }).eq('status', 'Requested'),
    supabase.from('allocations').select('id, expected_return_date, asset_id, employee_id').eq('status', 'Active').lt('expected_return_date', new Date().toISOString().slice(0, 10)),
    supabase.from('activity_log').select('id, action, entity_type, entity_id, created_at, actor_id').order('created_at', { ascending: false }).limit(8),
  ]);

  return NextResponse.json({
    kpis: {
      assetsAvailable: available.count ?? 0,
      assetsAllocated: allocated.count ?? 0,
      assetsReserved: reserved.count ?? 0,
      activeBookings: activeBookings.count ?? 0,
      pendingTransfers: pendingTransfers.count ?? 0,
      overdueReturnsCount: overdue.data?.length ?? 0,
    },
    overdueReturns: overdue.data ?? [],
    recentActivity: recentActivity.data ?? [],
  });
}
```

### Frontend wiring
- `app/(dashboard)/dashboard/page.tsx` — single `GET /api/dashboard/summary` call on mount, no other requests needed for this screen.
- `KpiCard.tsx` — six instances, one per `kpis.*` field. Map field → label: `assetsAvailable` → "Available", `assetsAllocated` → "Allocated", `activeBookings` → "Active Bookings", `pendingTransfers` → "Pending Transfers". (There's no server-computed "Upcoming Returns" count yet — if the mockup's 6th card needs it, add `allocations` where `expected_return_date` is within next 7 days and not yet overdue, as a 7th `Promise.all` entry; flag to Teammate B since Reports module also needs a similar near-term-date query pattern, worth sharing one SQL helper rather than duplicating.)
- `OverdueList.tsx` — renders `overdueReturns`, each needs the asset name + holder name joined client-side or via a follow-up `select` with joins (`.select('*, assets(name, asset_tag), employee_profiles(full_name)')`) — prefer doing the join in the query above rather than a second round trip.
- Recent Activity list — render `recentActivity` as plain text; `action` strings (e.g. `"allocation.created"`) need a small display-label map client-side (`{'asset.registered': 'registered', 'allocation.created': 'allocated to', ...}`) — keep this map in one shared file since Module 9 (Notifications) needs the identical mapping for `activity_log` display; don't duplicate it.
- Quick action buttons route to `/assets/new`, `/bookings/new`, `/maintenance/new` — no API calls on this screen itself.

### Gotchas
- `assets` table has **no `Reserved`-adjacent KPI named explicitly** in the mockup's exact 6 cards (Available/Allocated/Available-again/Active Bookings/Pending Transfers/Upcoming Returns) — the mockup shows "Available" twice in two different KPI slots per the Excalidraw export; confirm with the person who owns the pixel-exact layout whether the second "Available: 4" card is actually a different metric (possibly bookable-resources-available) before wiring blindly — don't guess and ship a wrong label.
- `overdue.count` above is wrong on purpose — count queries with `.lt()` on a joined-looking filter need `.select('id', ...)` not `head:true` combined with additional column selection; the code above already does this correctly by not mixing `head: true` with the fuller select in the same call — keep that pattern.

---

## Module 3 — Asset Registration & Directory (Screen 4)

### Tables/columns
`assets` (all columns), joined to `asset_categories.name`, `departments.name` for display.

### Endpoints (from file 6, confirmed against schema)
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/assets` | — (query params: `q`, `category`, `status`, `department`, `sortBy`, `sortDir`, `page`, `pageSize`) | `q` uses the GIN index on tag/name/serial |
| POST | `/api/assets` | `assetSchema` (see `lib/validators/index.ts`) | Admin/Asset Manager only |
| GET | `/api/assets/[id]` | — | single asset + joined category/department names |
| PATCH | `/api/assets/[id]` | partial `assetSchema` | edit non-status fields |
| PATCH | `/api/assets/[id]/status` | `{ status: AssetStatus }` | triggers DB-level transition validation; catch `422` for invalid transitions |
| GET | `/api/assets/[id]/history` | — | returns `{ allocations: [...], maintenance: [...] }` for that asset |

### Response shape for `GET /api/assets`
```json
{
  "data": [
    { "id": "...", "asset_tag": "AF-0012", "name": "Dell Laptop", "category_id": "...", "category_name": "Electronics", "status": "Allocated", "location": "Bangalore HQ", "department_id": "...", "department_name": "Engineering" }
  ],
  "count": 15, "page": 1, "pageSize": 25
}
```
The route as written in file 6 selects raw columns only — **add the category/department name joins** before handing this to frontend, since `AssetTable.tsx` per `2-ui-reference.md` needs `Category` and `Location` columns by name, not id. Use `.select('*, asset_categories(name), departments(name)')` and flatten in the response, or the frontend ends up doing N+1 lookups client-side (which would count as frontend-side data processing — explicitly out of scope per your instruction that all processing lives in the backend).

### Frontend wiring
- `assets/page.tsx` → `GET /api/assets` with filter/search state → `AssetTable.tsx`.
- `assets/new/page.tsx` → `AssetForm.tsx` → `POST /api/assets`. `asset_tag` and `qr_code` are server-generated (sequence + trigger) — don't render them as form inputs, don't send them in the POST body.
- `assets/[assetId]/page.tsx` → `GET /api/assets/[id]`.
- `assets/[assetId]/history/page.tsx` → `GET /api/assets/[id]/history` → `AssetHistoryTimeline.tsx`.
- `AssetStatusBadge.tsx` — pure display component keyed off the `status` enum string; color map: Available=green, Allocated=blue, Reserved=purple, Under Maintenance=amber, Lost=red, Retired=gray, Disposed=gray-darker. Same badge component gets reused by Module 4 (allocation-adjacent asset display) — build once, import everywhere, don't recreate per module.

### Gotchas
- `assets.status` cannot be set directly via the general `PATCH /api/assets/[id]` — must go through `/status` sub-route since the DB trigger `validate_asset_status_transition` only fires `before update of status`, and route-level logic should mirror that separation so a bad request gets a clean 422 instead of the DB trigger's raw `RAISE EXCEPTION` text.
- `document_urls` is a Postgres array (`text[]`) — Supabase JS returns/accepts this as a plain JS array, no special encoding needed, but validate array length client-side before upload to avoid megabyte-sized form payloads.

---

## Module 5 — Resource Booking (Screen 6)

### Tables/columns
`resource_bookings` (all columns), filtered against `assets.is_bookable = true` for the resource picker.

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/bookings` | query: `resourceAssetId`, `from`, `to`, `status` | for calendar view — pass a date range, not an unbounded list |
| POST | `/api/bookings` | `bookingSchema` | catch `409 { code: "SLOT_CONFLICT" }` specifically |
| PATCH | `/api/bookings/[id]/cancel` | — | sets `status='Cancelled'` |
| PATCH | `/api/bookings/[id]/reschedule` | `rescheduleBookingSchema` | re-runs the same overlap check via the DB constraint |

### The exact conflict-handling contract (critical — this is the headline demo interaction)
`POST /api/bookings` on an overlapping slot returns:
```json
{ "error": "This time slot conflicts with an existing booking", "code": "SLOT_CONFLICT" }
```
status `409`. Frontend (`BookingCalendar.tsx`) must render this as the dashed-outline rejected-slot block described in `2-ui-reference.md` Module 5 — **do not** just toast the generic error string; the UI needs to know it was specifically a slot conflict (via `code === 'SLOT_CONFLICT'`) to render the calendar-inline treatment vs. a validation error toast for something like a malformed date.

### Frontend wiring
- `bookings/page.tsx` → `GET /api/bookings?resourceAssetId=...&from=...&to=...` → `BookingCalendar.tsx`, which renders existing blocks and (on a failed attempt) the rejected-slot overlay using the same component's "attempted slot" prop per `2-ui-reference.md`.
- `bookings/new/page.tsx` → `BookingForm.tsx` → `POST /api/bookings`.
- Cancel/reschedule actions live on the calendar view itself (per mockup, no separate page) — wire directly to the two sub-routes above.
- Resource picker (which assets are bookable) needs `GET /api/assets?bookable=true` — **this filter param doesn't exist yet in file 6's assets route**; add `if (searchParams.get('bookable') === 'true') query = query.eq('is_bookable', true);` to `GET /api/assets`.

### Gotchas
- `starts_at`/`ends_at` are `timestamptz` — always send full ISO 8601 with timezone offset from the frontend (`bookingSchema` validates with `z.string().datetime()`, which requires this); a bare `"2026-07-14 09:00"` will fail validation, not silently misinterpret the timezone.
- Booking status rollover (Upcoming→Ongoing→Completed) is handled by the `pg_cron` job from `3-database-schema.md`/`5-supabase-push-and-seed.md`, **not** by this route — don't add client-side logic to compute "is this booking currently ongoing," trust the `status` field as-is.

---

## Module 7 — Asset Audit (Screen 8)

### Tables/columns
`audit_cycles`, `audit_cycle_auditors`, `audit_items`, joined to `assets` and `employee_profiles` for display.

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/audits` | query: `status`, `scopeDepartmentId` | list cycles |
| POST | `/api/audits` | `auditCycleSchema` | creates cycle + auditors + seeds `audit_items` for in-scope assets, per file 6 Section 7 |
| GET | `/api/audits/[id]` | — | cycle detail + all its `audit_items` joined to asset name/tag |
| PATCH | `/api/audits/[id]/verify` | `{ auditItemId, verification, notes }` | per-item, not per-cycle; catch `422` if cycle already closed |
| PATCH | `/api/audits/[id]/close` | — | calls `close_audit_cycle()` RPC; irreversible |

### Frontend wiring
- `audits/page.tsx` → `GET /api/audits` → list, click-through to detail.
- `audits/new/page.tsx` → `AuditCycleForm.tsx` — needs an asset multi-select (scope) and auditor multi-select; **send `asset_ids` explicitly** rather than relying on the backend's automatic department/location scoping alone if the frontend form lets someone hand-pick specific assets beyond the scope filter — confirm with whoever's building this form which UX it is (auto-scoped only vs. hand-pickable) before assuming `auditCycleSchema`'s `asset_ids` field always equals "everything in this department."
- `audits/[auditId]/page.tsx` → `AuditorVerificationGrid.tsx`, each row's status dropdown → `PATCH /api/audits/[id]/verify`. `DiscrepancyReport.tsx` renders count of `Missing`/`Damaged` items — **this count must come from the GET response, not be computed client-side** (per your instruction: no processing in frontend) — add a `discrepancyCount` field to the `GET /api/audits/[id]` response:
  ```typescript
  const discrepancyCount = items.filter(i => ['Missing', 'Damaged'].includes(i.verification)).length;
  // include this in the JSON response, don't make the frontend filter items.length itself
  ```
- "Close audit cycle" button → `PATCH /api/audits/[id]/close`, then redirect back to the cycle list — after this call, `AuditorVerificationGrid.tsx` rows should render read-only (backend will 422 any further verify attempts anyway, but disable the UI proactively for a clean UX, not just relying on the error).

### Gotchas
- `audit_items.verification` default is `'Pending'`, not one of the three "real" outcomes — don't let the frontend's status dropdown default to `'Verified'`, it should show `'Pending'` until an auditor actually acts.
- Once `audit_cycles.status = 'Closed'`, the DB trigger `prevent_edit_after_close()` blocks any `audit_items` update at the database level regardless of what the route does — this is a real safety net, but the route should still pre-check cycle status and return a clean `409`/`422` rather than surfacing the trigger's raw Postgres error text to the frontend.

---

## Module 9 — Notifications & Activity Log (Screen 10)

### Tables/columns
`notifications` (RLS-scoped to `recipient_id = auth.uid()` automatically), `activity_log` (readable by all authenticated per RLS).

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/notifications` | query: `isRead`, `page`, `pageSize` | only ever returns the caller's own notifications (RLS) |
| PATCH | `/api/notifications/[id]/read` | — | sets `is_read = true` |
| GET | `/api/activity-log` | query: `entityType`, `page`, `pageSize` | **not listed in file 6 at all — add this route now**, simple read-only list over `activity_log` for the full-log half of this screen |

New route to add:
```typescript
// src/app/api/activity-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server-auth';
import { apiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get('entityType');
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(50, Number(searchParams.get('pageSize') ?? '25'));

  let query = supabase
    .from('activity_log')
    .select('id, action, entity_type, entity_id, metadata, created_at, employee_profiles(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (entityType) query = query.eq('entity_type', entityType);
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) return apiError(error.message, 400);

  return NextResponse.json({ data, count, page, pageSize });
}
```

### Frontend wiring
- `notifications/page.tsx` — filter pills (All/Unread/type) map to `?isRead=false` or client-side tab state calling different `entityType`/`type` filters; clicking a notification → `PATCH /api/notifications/[id]/read` then optimistically mark read in local state (this is UI state, not "processing," so it's fine client-side).
- `NotificationItem.tsx` — the type→color/icon map mentioned in `2-ui-reference.md` should live in one shared constants file (e.g. `src/lib/notification-display.ts`) — **this is the same map Module 1's Recent Activity feed needs** for `activity_log.action` strings, so coordinate with Teammate A's own Module 1 section above rather than each building a separate map.

### Gotchas
- `notifications.type` is a Postgres enum with spaces in its values (e.g. `'Overdue Return Alert'`) — when filtering by type from a query param, pass the exact string including spaces, URL-encoded; don't slugify it to `overdue-return-alert` and expect the backend to match.
- Since RLS already scopes `notifications` to the caller, **never add a manual `recipient_id` filter in the route that could conflict with or duplicate RLS** — just query the table plainly; RLS enforces correctness.

---
---

# TEAMMATE B — Even Modules

---

## Module 2 — Organization Setup (Screen 3, Admin only — 3 tabs)

### Tables/columns
`departments` (all columns, including self-referencing `parent_department_id` and `head_employee_id`), `asset_categories` (including `code` and `extra_fields` jsonb), `employee_profiles`.

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET, POST | `/api/departments` | `departmentSchema` | Admin-only write |
| GET, PATCH | `/api/departments/[id]` | partial `departmentSchema` | edit/deactivate |
| GET, POST | `/api/categories` | `categorySchema` | Admin-only write; schema now includes `code` (confirmed present in live schema you shared) |
| GET, PATCH | `/api/categories/[id]` | partial `categorySchema` | |
| GET | `/api/employees` | query: `role`, `departmentId`, `status` | directory read, **no POST** — see note below |
| PATCH | `/api/employees/[id]` | `updateEmployeeSchema` | edit name/department/status — NOT role |
| PATCH | `/api/employees/[id]/promote` | `{ role: Role }` | the **only** place role changes happen anywhere in the app |

### Resolved ambiguity from file 6
File 6 flagged that `departments.head_employee_id` is a uuid FK but an earlier draft schema implied a name string. **Confirmed from the schema you just shared: `head_employee_id uuid` referencing `employee_profiles(id)`.** So `DepartmentForm.tsx`'s "Head" field must be an employee **picker** (searchable select sourced from `GET /api/employees`), not a free-text name field — resolve to an id client-side before submit, send `head_employee_id` as a uuid in the `POST`/`PATCH` body.

### Resolved: `asset_categories.code`
Also confirmed present in your latest schema (`code text UNIQUE`) — no migration gap remains here, file 6's flagged concern is resolved. `CategoryForm.tsx` should include a `code` input (e.g. short uppercase code like `ELEC`, `FURN`) alongside `name` and any `extra_fields` (dynamic key/value pairs, e.g. warranty period for Electronics — render as a simple key/value list editor, store as-is in the `extra_fields` jsonb column, no special parsing needed beyond `JSON`-safe values).

### Resolved: Employee "create" flow
Per `AGENTS.md` Section 3 rule 1, **there is no `POST /api/employees`** — employees only ever come from real signup. `EmployeeDirectoryTable.tsx` on this tab is **read + promote + deactivate only**. If the frontend mock shows an "+ Add" button on the Employees tab (per `2-ui-reference.md`'s note that "+Add" is context-aware per active tab), that button should be disabled/hidden on the Employees tab specifically, or repurposed as "invite" messaging only ("ask them to sign up, then promote them here") — do not wire it to a fake employee-creation endpoint.

### Frontend wiring
- `organization/departments/page.tsx` → `GET /api/departments` → table with Status pill badges (reuse `StatusBadge` pattern from Module 3). Edits here (`PATCH`) directly affect the picklists Modules 3/4/5 read from — no special cache invalidation needed since those modules always re-fetch `GET /api/departments` fresh, but flag to Teammate A that department names shown in `AssetTable.tsx` should re-fetch rather than being cached long-term client-side.
- `organization/categories/page.tsx` → `GET /api/categories` → table + `CategoryForm.tsx`.
- `organization/employees/page.tsx` → `GET /api/employees` → `EmployeeDirectoryTable.tsx`; promote action → `PATCH /api/employees/[id]/promote`; deactivate → `PATCH /api/employees/[id]` with `{ status: 'Inactive' }`.

### Gotchas
- Promoting someone doesn't auto-refresh their currently-open session's cached role client-side — that's handled by the `/api/auth/session` re-sync endpoint from file 4/7, not anything in this module. Don't duplicate that logic here.
- `parent_department_id` self-reference means the department picker in `DepartmentForm.tsx` must exclude the department being edited itself (and its own descendants, to prevent a cycle) — the DB has no cycle-prevention constraint, so this is a frontend + route-level validation responsibility. Add a check in `PATCH /api/departments/[id]`: reject if `parent_department_id` would create a cycle (walk up the parent chain server-side before allowing the update).

---

## Module 4 — Asset Allocation & Transfer (Screen 5)

### Tables/columns
`allocations`, `transfer_requests`, joined to `assets`, `employee_profiles`, `departments`.

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/allocations` | query: `assetId`, `employeeId`, `departmentId`, `status` | |
| POST | `/api/allocations` | `allocationSchema` | catch `409 { code: "ALREADY_ALLOCATED" }` — **must** include current holder info, see below |
| PATCH | `/api/allocations/[id]/return` | `returnAllocationSchema` | sets status Returned, asset back to Available |
| GET, POST | `/api/allocations/transfers` (or `/api/transfers`, confirm which path file 6 actually used — flag if inconsistent) | `transferRequestSchema` | |
| PATCH | `/api/allocations/transfers/[id]/approve` | — | calls `approve_transfer()` RPC |
| PATCH | `/api/allocations/transfers/[id]/reject` | — | sets status Rejected |

### The exact conflict-handling contract (this module's headline interaction — mirrors Module 5's booking conflict)
`POST /api/allocations` on an already-allocated asset must return enough to render the exact mockup banner. The route needs to **look up the current holder** before/after catching the `409`, not just return a bare error:

```typescript
// inside POST /api/allocations, after catching the 23505 on uidx_one_active_allocation_per_asset:
const { data: currentAllocation } = await supabase
  .from('allocations')
  .select('id, employee_profiles(full_name), departments(name)')
  .eq('asset_id', body.asset_id)
  .eq('status', 'Active')
  .single();

return NextResponse.json({
  error: 'This asset is already allocated',
  code: 'ALREADY_ALLOCATED',
  currentHolder: currentAllocation?.employee_profiles?.full_name ?? null,
  currentDepartment: currentAllocation?.departments?.name ?? null,
  currentAllocationId: currentAllocation?.id ?? null,
}, { status: 409 });
```
`translatePgError`/`fromPostgresError` in file 6/7's shared helper currently returns just `{ error, code }` for this case — **extend it** (or handle this specific case inline in the route rather than the generic helper, since it needs an extra DB lookup the generic error translator shouldn't be responsible for) so `ConflictDialog`/`AllocationConflictBanner.tsx` can render "Already Allocated to Priya Shah (Engineering)" exactly as the mockup shows, and `currentAllocationId` lets the pre-filled Transfer Request form's "From" field populate without a second round-trip.

### Frontend wiring
- `allocations/page.tsx` → `GET /api/allocations` → active allocations list.
- `allocations/new/page.tsx` → `AllocationForm.tsx` → `POST /api/allocations`; on `409 ALREADY_ALLOCATED`, render `AllocationConflictBanner.tsx` inline (not a modal, per `2-ui-reference.md`) using the response's `currentHolder`/`currentDepartment`, and show the Transfer Request form pre-filled with `allocation_id: currentAllocationId`.
- `allocations/transfers/page.tsx` → `GET /api/allocations/transfers?status=Requested` → `TransferRequestCard.tsx` list; approve/reject buttons → the two `PATCH` sub-routes.
- Return flow (mark returned + condition notes) — no separate screen in the mockup; wire as an action on the allocation detail/list row → `PATCH /api/allocations/[id]/return`.

### Gotchas
- `allocations.employee_id` **or** `department_id` must be set (DB check constraint `chk_holder`) — `AllocationForm.tsx` needs a toggle between "allocate to person" vs. "allocate to department," not both fields shown simultaneously as optional text inputs.
- `approve_transfer()` RPC does the allocation-close + new-allocation-open + status-flip in one DB transaction — the approve route should be a single `supabase.rpc('approve_transfer', {...})` call, not three separate manual updates; don't reimplement its logic in the route.

---

## Module 6 — Maintenance Management (Screen 7, Kanban)

### Tables/columns
`maintenance_requests` (all columns), joined to `assets`, `employee_profiles` (raised_by, approved_by).

### Endpoints
| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/maintenance` | query: `status`, `assetId`, `priority` | for Kanban, fetch all statuses in one call and bucket client-side into columns (bucketing by an already-known enum value is UI layout, not "processing" — fine client-side) |
| POST | `/api/maintenance` | `maintenanceRequestSchema` | any active employee can raise |
| PATCH | `/api/maintenance/[id]/approve` | — | flips asset to Under Maintenance via DB trigger |
| PATCH | `/api/maintenance/[id]/reject` | — | |
| PATCH | `/api/maintenance/[id]/assign` | `maintenanceAssignSchema` (`technician_name`) | Pending→Technician Assigned isn't a direct enum jump — confirm workflow order below |
| PATCH | `/api/maintenance/[id]/resolve` | — | flips asset back to Available via DB trigger, stamps `resolved_at` |

### Workflow order clarification (important — the enum's actual value list vs. the 5-column board)
The DB enum is `'Pending', 'Approved', 'Rejected', 'Technician Assigned', 'In Progress', 'Resolved'`. The Kanban board per `2-ui-reference.md` has 5 columns: **Pending | Approved | Technician Assigned | In Progress | Resolved** (Rejected isn't a board column — it's a terminal state that removes the card from the active board, likely shown in a filtered "Rejected" view instead). Card movement across columns corresponds to: `approve` (Pending→Approved, also triggers asset status), `assign` (Approved→Technician Assigned, requires `technician_name`), a currently-unbuilt **"start work" transition** (Technician Assigned→In Progress — **file 6 didn't define a route for this specific transition**; add `PATCH /api/maintenance/[id]/start` setting `status='In Progress'`), then `resolve` (→Resolved). Build the missing `/start` route now:

```typescript
// src/app/api/maintenance/[id]/start/route.ts
import { NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/supabase/server-auth';
import { can } from '@/lib/permissions';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!profile) return apiError('Not authenticated', 401);
  if (!can.approveMaintenance(profile)) return unauthorized();

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update({ status: 'In Progress' })
    .eq('id', id)
    .eq('status', 'Technician Assigned')
    .select()
    .single();

  if (error) return fromPostgresError(error);
  if (!data) return apiError('Request must be in Technician Assigned status to start work', 409);

  await supabase.rpc('log_activity', { p_actor_id: profile.id, p_action: 'maintenance.started', p_entity_type: 'maintenance_request', p_entity_id: id, p_metadata: {} });
  return NextResponse.json({ data });
}
```

### Frontend wiring
- `maintenance/page.tsx` → `GET /api/maintenance` (all statuses) → `MaintenanceWorkflowBoard.tsx` buckets into 5 columns client-side by `status` string match (again: this is layout bucketing of already-authoritative data, not computation — acceptable client-side).
- `maintenance/new/page.tsx` → `MaintenanceForm.tsx` → `POST /api/maintenance`.
- Card actions (approve/assign/start/resolve/reject) call the respective `PATCH` sub-routes; after any successful action, re-fetch the list rather than manually moving the card client-side and trusting optimistic state — given the DB trigger side-effects (asset status changes), a fresh fetch keeps the board honest.

### Gotchas
- Don't let the frontend set `status` directly via a generic `PATCH /api/maintenance/[id]` — there's intentionally no such generic route; every transition has its own narrow endpoint so each can carry its own DB trigger side-effect and validation (e.g. `assign` requires `technician_name`, `approve` doesn't).
- `sync_asset_status_on_maintenance()` trigger only fires `before update of status` — so the `approve`/`resolve` routes must actually change the `status` column value (not just re-save the same value) for the asset-status side effect to fire.

---

## Module 8 — Reports & Analytics (Screen 9)

### Tables/columns
Read-only aggregates across `allocations`, `maintenance_requests`, `resource_bookings`, `assets`, `departments` — **zero writes**, and per your explicit instruction, **zero computation in the frontend**. Every number/chart-ready array below is pre-aggregated in SQL.

### Endpoints
| Method | Path | Query params | Returns |
|---|---|---|---|
| GET | `/api/reports/utilization` | `from`, `to`, `departmentId?` | per-department allocation counts, chart-ready |
| GET | `/api/reports/maintenance-frequency` | `from`, `to` | per-asset/category request counts + avg resolution time |
| GET | `/api/reports/booking-heatmap` | `from`, `to` | per-resource, per-hour-bucket counts |
| GET | `/api/reports/due-for-maintenance` | — | assets flagged as due soon / nearing retirement |
| GET | `/api/reports/department-summary` | — | allocation summary by department |

### Exact aggregation queries (fill in file 6's Section 10, which described these narratively but didn't give final SQL)

```typescript
// src/app/api/reports/utilization/route.ts
const { data, error } = await supabase
  .rpc('report_utilization_by_department', { p_from: from, p_to: to });
// backed by a SQL function (add via new migration 0012_reporting_functions.sql):
```
```sql
create or replace function report_utilization_by_department(p_from date, p_to date)
returns table(department_id uuid, department_name text, active_count bigint, total_count bigint)
language sql stable as $$
  select d.id, d.name,
    count(*) filter (where a.status = 'Active') as active_count,
    count(*) as total_count
  from departments d
  left join allocations a on a.department_id = d.id
    and a.allocated_at::date between p_from and p_to
  group by d.id, d.name
  order by active_count desc;
$$;
```

```sql
-- for maintenance-frequency
create or replace function report_maintenance_frequency(p_from date, p_to date)
returns table(asset_id uuid, asset_tag text, asset_name text, request_count bigint, avg_resolution_hours numeric)
language sql stable as $$
  select a.id, a.asset_tag, a.name,
    count(m.id) as request_count,
    avg(extract(epoch from (m.resolved_at - m.created_at)) / 3600) filter (where m.resolved_at is not null) as avg_resolution_hours
  from assets a
  join maintenance_requests m on m.asset_id = a.id
  where m.created_at::date between p_from and p_to
  group by a.id, a.asset_tag, a.name
  order by request_count desc;
$$;
```

```sql
-- for booking-heatmap
create or replace function report_booking_heatmap(p_from date, p_to date)
returns table(resource_asset_id uuid, resource_name text, hour_bucket int, booking_count bigint)
language sql stable as $$
  select b.resource_asset_id, a.name, extract(hour from b.starts_at)::int,
    count(*)
  from resource_bookings b
  join assets a on a.id = b.resource_asset_id
  where b.starts_at::date between p_from and p_to
  group by b.resource_asset_id, a.name, extract(hour from b.starts_at)
  order by resource_asset_id, hour_bucket;
$$;
```

```sql
-- for due-for-maintenance / nearing retirement
create or replace function report_due_for_attention()
returns table(asset_id uuid, asset_tag text, asset_name text, reason text, detail text)
language sql stable as $$
  select id, asset_tag, name, 'nearing_retirement',
    'Acquired ' || acquisition_date::text
  from assets
  where acquisition_date < now() - interval '4 years' and status not in ('Retired', 'Disposed')
  union all
  select a.id, a.asset_tag, a.name, 'overdue_maintenance_check',
    'Last request: ' || max(m.created_at)::text
  from assets a
  join maintenance_requests m on m.asset_id = a.id
  group by a.id, a.asset_tag, a.name
  having max(m.created_at) < now() - interval '6 months';
$$;
```

Add all four as a new additive migration, `0012_reporting_functions.sql` — per `AGENTS.md` Section 5, don't touch earlier migration files.

### Frontend wiring
- `reports/page.tsx` — one page, 5 parallel `GET` calls (or a combined `GET /api/reports/dashboard-all` if you'd rather batch them — flag which the frontend prefers, don't assume).
- Bar chart (utilization) and line chart (maintenance frequency) feed straight from the two respective endpoints' `data` arrays into `recharts` — no client-side grouping/summing, the SQL functions already return chart-ready rows.
- "Most-used / Idle assets" and "Assets due for maintenance / nearing retirement" plain-text lists → `report_due_for_attention()` response, filtered by `reason` client-side for display grouping only (not recomputing the "is it due" logic, which stays server-side).
- Export button — **explicitly out of scope for this round** per your instruction; leave it visually present but disabled/"coming soon," don't wire a client-side CSV export here.

### Gotchas
- All five report endpoints are `GET`-only — file 6 flagged that stub files had unnecessary `POST` handlers; confirm those are actually removed, since a stray `POST` on a reports route with no real purpose is just dead surface area.
- These SQL functions run as `stable`, not `security definer` — they rely on the caller's session having read access via existing RLS select policies on the underlying tables, which are already open to any authenticated user per `0010_rls_policies.sql`. No extra grants needed.

---
---

## Shared cross-cutting notes (both teammates, read once)

- **One `StatusBadge` component, one color map** — used by Modules 2 (dept status), 3 (asset lifecycle), 5 (booking status), 7 (audit verification). Build it once; whoever gets there first in dev order owns it, the other imports it.
- **One activity-log/notification display-label map** — needed by Module 1 (Recent Activity) and Module 9 (Notifications list), both reading `activity_log.action` / `notifications.type` strings. Coordinate directly rather than each building a separate map — this is the one piece of actual cross-teammate coordination needed beyond this file.
- **Every list endpoint's pagination contract is identical** (`q`/`sortBy`/`sortDir`/`page`/`pageSize` → `{ data, count, page, pageSize }`) — build one shared `useTableQuery` hook (client-side) once, reuse across every module's list screen, regardless of who "owns" that hook file.
- **No client-side aggregation, filtering-as-computation, or export logic anywhere** — every count, sum, average, or discrepancy tally in this file comes pre-computed from the API. If a screen seems to need a number the API doesn't provide, add it to the relevant route/SQL function rather than computing it in a component.
