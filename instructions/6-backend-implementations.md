# 6 — Backend Implementation (Route Handlers + DB CRUD, all modules)

## 0. Where this picks up

Files 1–5 are done: folder scaffold, UI reference, DB schema (`supabase/migrations/`), auth screens (`4-auth-implementation.md`), and the hosted Supabase push + seed. What that left behind, verified directly against the current repo before writing this file:

- **21 API route files exist but are stubs.** Every file under `src/app/api/**/route.ts` *except* the five in `src/app/api/auth/` currently returns `{ status: 'not implemented' }` for every verb. That's the actual gap this file closes.
- **`src/lib/validators/asset.schema.ts`, `allocation.schema.ts`, `booking.schema.ts`, `maintenance.schema.ts`, `audit.schema.ts` are empty (0 bytes).** Only `auth.schema.ts` and `org-setup.schema.ts` have content, from file 4.
- **`src/lib/permissions.ts` and `src/lib/constants.ts` are empty.** Nothing central to import yet — every route below needs this to exist first.
- **`src/types/{asset,allocation,booking,maintenance,audit}.ts` and `src/types/index.ts` are empty.** `src/types/database.types.ts` is currently a one-line placeholder (`export type Database = any;`) — it has **not** been generated from real migrations yet.
- **Correction to `3-database-schema.md`'s own example**: that file's sample `GET /api/assets` handler imports `createServerClient` from `@/lib/supabase/server`. The actual exported function in this repo is `createClient` (see `src/lib/supabase/server.ts`, and confirmed by how every real `src/app/api/auth/*/route.ts` file imports it: `import { createClient } from '@/lib/supabase/server'`). Every code sample in this file uses the real name, `createClient`. Don't reintroduce `createServerClient` — it doesn't exist in this codebase.

Nothing in `src/app/(auth)`, `src/app/(dashboard)`, `src/components`, or the migrations gets touched by this task. This is additive: fill in the stub bodies, add the missing lib files, don't restructure anything.

---

## 1. Order of operations

Do these once, before touching any route file:

1. **Apply migrations and generate real types** — the whole backend depends on this, and skipping it is why `database.types.ts` is still `any` today:
   ```bash
   supabase start                # or supabase db reset if already running
   supabase gen types typescript --local > src/types/database.types.ts
   ```
2. Build the shared `lib` layer first (Section 2 below): `permissions.ts`, `constants.ts`, the response helper, and all five validator schemas. Every route in Sections 3–11 imports from these — writing routes before this exists just means redoing them.
3. Then implement module by module, in this order, matching the build-order priority in `AGENTS.md` Section 8: **assets → allocations/transfers → bookings → maintenance → audits → departments/categories/employees → notifications → reports**.
4. Every mutating route ends its happy path with a call to `log_activity(...)` (from `0009_notifications_activity_log.sql`) per `AGENTS.md` Section 3, rule 8. Don't skip this because it "isn't the main feature" — it's cross-cutting and judged.

---

## 2. Shared `lib` layer (build this first)

### 2.1 `src/lib/constants.ts`

```typescript
export const ROLES = ['Admin', 'Asset Manager', 'Department Head', 'Employee'] as const;
export type Role = (typeof ROLES)[number];

export const ASSET_STATUSES = [
  'Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed',
] as const;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

// Postgres error codes the route handlers need to translate into meaningful HTTP responses
// rather than leaking raw Postgres messages (AGENTS.md Section 6).
export const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',       // e.g. uidx_one_active_allocation_per_asset
  EXCLUSION_VIOLATION: '23P01',    // booking overlap EXCLUDE constraint
  CHECK_VIOLATION: '23514',
  RAISE_EXCEPTION: 'P0001',        // plpgsql `raise exception`, e.g. invalid status transition
} as const;
```

### 2.2 `src/lib/permissions.ts`

Central capability checks per `AGENTS.md` Section 4 — every route imports from here, nothing inline.

```typescript
import type { Role } from '@/lib/constants';

export type EmployeeProfile = {
  id: string;
  role: Role;
  department_id: string | null;
  status: 'Active' | 'Inactive';
};

export function hasRole(profile: EmployeeProfile | null, ...allowed: Role[]): boolean {
  return !!profile && profile.status === 'Active' && allowed.includes(profile.role);
}

// Capability checks — one per meaningful action, named after what the action IS, not which
// roles happen to be allowed today, so a future role change is a one-line diff here.
export const can = {
  manageOrgMasterData: (p: EmployeeProfile | null) => hasRole(p, 'Admin'),
  promoteEmployee: (p: EmployeeProfile | null) => hasRole(p, 'Admin'),
  registerOrEditAsset: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  changeAssetStatus: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  allocateAsset: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  approveTransfer: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager', 'Department Head'),
  bookResource: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager', 'Department Head', 'Employee'),
  cancelBooking: (p: EmployeeProfile | null, booking: { booked_by: string }) =>
    !!p && (p.id === booking.booked_by || hasRole(p, 'Admin', 'Asset Manager', 'Department Head')),
  raiseMaintenance: (p: EmployeeProfile | null) => !!p && p.status === 'Active',
  approveMaintenance: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  manageAuditCycles: (p: EmployeeProfile | null) => hasRole(p, 'Admin', 'Asset Manager'),
  verifyAuditItem: (p: EmployeeProfile | null, auditorIds: string[]) =>
    !!p && (auditorIds.includes(p.id) || hasRole(p, 'Admin', 'Asset Manager')),
};
```

### 2.3 `src/lib/api-response.ts` (new file, not previously listed in `1-folder-structure.md` — add it under `lib/` alongside `permissions.ts`)

One shared helper so every route returns the same failure shape (`AGENTS.md` Section 6) instead of each route hand-rolling it.

```typescript
import { NextResponse } from 'next/server';
import { PG_ERROR } from '@/lib/constants';

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return apiError('You do not have permission to perform this action', 403);
}

export function notFound(entity: string) {
  return apiError(`${entity} not found`, 404);
}

// Translates raw Postgres/PostgREST errors into safe, meaningful responses.
// Never forward error.message from Supabase straight to the client for anything
// other than these known, intentionally-user-facing cases.
export function fromPostgresError(error: { code?: string; message: string }, context: {
  onUniqueViolation?: () => NextResponse;
  onExclusionViolation?: () => NextResponse;
} = {}) {
  if (error.code === PG_ERROR.UNIQUE_VIOLATION && context.onUniqueViolation) {
    return context.onUniqueViolation();
  }
  if (error.code === PG_ERROR.EXCLUSION_VIOLATION && context.onExclusionViolation) {
    return context.onExclusionViolation();
  }
  if (error.code === PG_ERROR.RAISE_EXCEPTION) {
    // plpgsql RAISE EXCEPTION messages here are already deliberately user-safe
    // (see validate_asset_status_transition, approve_transfer, close_audit_cycle).
    return apiError(error.message, 409);
  }
  return apiError('Something went wrong processing this request', 400);
}
```

### 2.4 `src/lib/auth-context.ts` (new file, small helper reused by every route below)

```typescript
import { createClient } from '@/lib/supabase/server';
import type { EmployeeProfile } from '@/lib/permissions';

// Every protected route starts with this one call: confirms a logged-in session
// AND loads the role/department needed for the `can.*` checks in permissions.ts.
export async function getCurrentProfile(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; profile: EmployeeProfile | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null };

  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('id, role, department_id, status')
    .eq('id', user.id)
    .single();

  return { supabase, profile: profile as EmployeeProfile | null };
}
```

### 2.5 Validator schemas — fill in the five empty files

`src/lib/validators/asset.schema.ts`:
```typescript
import { z } from 'zod';
import { ASSET_STATUSES } from '@/lib/constants';

export const createAssetSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  serialNumber: z.string().optional(),
  acquisitionDate: z.string().date().optional(),
  acquisitionCost: z.number().nonnegative().optional(),
  condition: z.string().default('Good'),
  location: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  isBookable: z.boolean().default(false),
  photoUrl: z.string().url().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

// Status changes are a SEPARATE, narrower endpoint (PATCH /api/assets/[assetId]/status) —
// never allow status through the general update schema above (AGENTS.md Section 3, rule 2).
export const changeAssetStatusSchema = z.object({
  status: z.enum(ASSET_STATUSES),
  reason: z.string().optional(), // required in practice for Lost/Retired, enforced in the route
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ChangeAssetStatusInput = z.infer<typeof changeAssetStatusSchema>;
```

`src/lib/validators/allocation.schema.ts`:
```typescript
import { z } from 'zod';

export const createAllocationSchema = z.object({
  assetId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  expectedReturnDate: z.string().date().optional(),
}).refine((v) => v.employeeId || v.departmentId, {
  message: 'Either employeeId or departmentId is required',
});

export const returnAllocationSchema = z.object({
  returnConditionNotes: z.string().optional(),
});

export const createTransferRequestSchema = z.object({
  allocationId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  reason: z.string().optional(),
});

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;
export type ReturnAllocationInput = z.infer<typeof returnAllocationSchema>;
export type CreateTransferRequestInput = z.infer<typeof createTransferRequestSchema>;
```

`src/lib/validators/booking.schema.ts`:
```typescript
import { z } from 'zod';

export const createBookingSchema = z.object({
  resourceAssetId: z.string().uuid(),
  bookedForDepartmentId: z.string().uuid().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'endsAt must be after startsAt',
});

export const rescheduleBookingSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
}).refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
  message: 'endsAt must be after startsAt',
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
```

`src/lib/validators/maintenance.schema.ts`:
```typescript
import { z } from 'zod';

export const createMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  issueDescription: z.string().min(5),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  photoUrl: z.string().url().optional(),
});

export const approveMaintenanceSchema = z.object({
  decision: z.enum(['Approved', 'Rejected']),
});

export const assignTechnicianSchema = z.object({
  technicianName: z.string().min(2),
});

export const resolveMaintenanceSchema = z.object({
  notes: z.string().optional(),
});

export type CreateMaintenanceInput = z.infer<typeof createMaintenanceSchema>;
export type ApproveMaintenanceInput = z.infer<typeof approveMaintenanceSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
```

`src/lib/validators/audit.schema.ts`:
```typescript
import { z } from 'zod';

export const createAuditCycleSchema = z.object({
  name: z.string().min(2),
  scopeDepartmentId: z.string().uuid().optional(),
  scopeLocation: z.string().optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  auditorEmployeeIds: z.array(z.string().uuid()).min(1),
}).refine((v) => v.endDate >= v.startDate, { message: 'endDate must be on or after startDate' });

export const verifyAuditItemSchema = z.object({
  verification: z.enum(['Verified', 'Missing', 'Damaged']),
  notes: z.string().optional(),
});

export type CreateAuditCycleInput = z.infer<typeof createAuditCycleSchema>;
export type VerifyAuditItemInput = z.infer<typeof verifyAuditItemSchema>;
```

Once real types are generated (Section 1, step 1), replace the placeholder empty files under `src/types/{asset,allocation,booking,maintenance,audit}.ts` with narrow row aliases, e.g.:

```typescript
// src/types/asset.ts
import type { Database } from '@/types/database.types';
export type Asset = Database['public']['Tables']['assets']['Row'];
export type AssetStatus = Asset['status'];
```
Repeat the same one-line pattern for the other four entity files, then re-export the lot from `src/types/index.ts` (`export * from './asset'; export * from './allocation'; ...`).

---

## 3. Assets module

### `GET, POST /api/assets`

- `GET`: use the exact search/sort/filter pattern already specified in `3-database-schema.md`'s "Backend search/sort/filter API implementation pattern" section — `q / category / status / department / sortBy / sortDir / page / pageSize`, with `sortBy` whitelisted and `pageSize` capped at `MAX_PAGE_SIZE`. That pattern is correct as written except for the `createServerClient` → `createClient` import name (Section 0 above).
- `POST`: requires `can.registerOrEditAsset`. Validate with `createAssetSchema`. Insert; `asset_tag` and `qr_code` are DB-generated/defaulted, don't send them from the client. Call `log_activity(actor_id, 'asset.registered', 'asset', asset.id, { name })` on success.

```typescript
// src/app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { createAssetSchema } from '@/lib/validators/asset.schema';
import { apiError, unauthorized } from '@/lib/api-response';
import { MAX_PAGE_SIZE } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const category = searchParams.get('category');
  const status = searchParams.get('status');
  const department = searchParams.get('department');
  const sortBy = searchParams.get('sortBy') ?? 'created_at';
  const sortDir = searchParams.get('sortDir') === 'asc';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '25'), MAX_PAGE_SIZE);

  let query = supabase
    .from('assets')
    .select('id, asset_tag, name, category_id, status, location, department_id, is_bookable', { count: 'exact' });

  if (q) query = query.textSearch('asset_tag', q, { type: 'websearch', config: 'english' });
  if (category) query = query.eq('category_id', category);
  if (status) query = query.eq('status', status);
  if (department) query = query.eq('department_id', department);

  const allowedSortColumns = ['created_at', 'name', 'status', 'asset_tag'];
  query = query.order(allowedSortColumns.includes(sortBy) ? sortBy : 'created_at', { ascending: sortDir });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 400);
  return NextResponse.json({ data, count, page, pageSize });
}

export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.registerOrEditAsset(profile)) return unauthorized();

  const parsed = createAssetSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('assets').insert({
    name: v.name,
    category_id: v.categoryId,
    serial_number: v.serialNumber,
    acquisition_date: v.acquisitionDate,
    acquisition_cost: v.acquisitionCost,
    condition: v.condition,
    location: v.location,
    department_id: v.departmentId,
    is_bookable: v.isBookable,
    photo_url: v.photoUrl,
  }).select().single();

  if (error) return apiError(error.message, 400);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'asset.registered', p_entity_type: 'asset', p_entity_id: data.id,
    p_metadata: { name: data.name, asset_tag: data.asset_tag },
  });

  return NextResponse.json({ data }, { status: 201 });
}
```

### `GET, PATCH /api/assets/[assetId]`
- `GET`: single asset with joined category name, department name, and current active allocation (if any) — needed for the asset detail screen's "currently held by" banner.
- `PATCH`: `can.registerOrEditAsset`, validated with `updateAssetSchema` (never accepts `status` — that's the next endpoint). Log `asset.updated`.

### `PATCH /api/assets/[assetId]/status`
This is the endpoint enforcing rule 2 in `AGENTS.md` Section 3. The DB trigger `validate_asset_status_transition()` already rejects illegal transitions at the database level — this route's job is to require `can.changeAssetStatus`, pass the client's desired status straight through to the DB update (never pre-filter transitions in app code, since that would duplicate and could drift from the trigger), and catch the trigger's `raise exception` (`P0001`) via `fromPostgresError` to surface it as a clean `409` instead of a raw Postgres message.

```typescript
// src/app/api/assets/[assetId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth-context';
import { can } from '@/lib/permissions';
import { changeAssetStatusSchema } from '@/lib/validators/asset.schema';
import { apiError, unauthorized, fromPostgresError } from '@/lib/api-response';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.changeAssetStatus(profile)) return unauthorized();

  const parsed = changeAssetStatusSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { data, error } = await supabase
    .from('assets')
    .update({ status: parsed.data.status })
    .eq('id', assetId)
    .select()
    .single();

  if (error) return fromPostgresError(error);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'asset.status_changed', p_entity_type: 'asset', p_entity_id: assetId,
    p_metadata: { new_status: parsed.data.status, reason: parsed.data.reason ?? null },
  });

  return NextResponse.json({ data });
}
```

---

## 4. Allocations & transfers module

### `GET, POST /api/allocations`
- `GET`: same list pattern as assets, filterable by `employeeId`, `departmentId`, `status`, `assetId`; RLS already scopes rows to "own or department or manager/head" per `0010_rls_policies.sql`, so the query itself doesn't need an extra manual scope filter beyond what the user explicitly asks for — RLS is the authoritative floor.
- `POST`: `can.allocateAsset`, validated with `createAllocationSchema`. This is the endpoint judges will specifically test (AGENTS.md Section 8) — the double-allocation rule is enforced by `uidx_one_active_allocation_per_asset`, not by a pre-check `SELECT`, because a pre-check has a race condition and the unique index doesn't. On `23505`, look up the asset's current active allocation and return it in the 409 body so the frontend can render "Already Allocated to X" and offer the transfer-request flow, per the exact wording of `3-database-schema.md`'s note on this.

```typescript
// src/app/api/allocations/route.ts (POST body)
export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.allocateAsset(profile)) return unauthorized();

  const parsed = createAllocationSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data, error } = await supabase.from('allocations').insert({
    asset_id: v.assetId,
    employee_id: v.employeeId ?? null,
    department_id: v.departmentId ?? null,
    expected_return_date: v.expectedReturnDate,
  }).select().single();

  if (error) {
    return fromPostgresError(error, {
      onUniqueViolation: async () => {
        const { data: current } = await supabase
          .from('allocations')
          .select('id, employee_id, employee_profiles(full_name)')
          .eq('asset_id', v.assetId)
          .eq('status', 'Active')
          .single();
        return NextResponse.json(
          { error: 'Asset is already allocated', currentAllocation: current },
          { status: 409 },
        );
      },
    });
  }

  // Asset status flip to 'Allocated' goes through the SAME transition-validated path as
  // Section 3 — call the status endpoint's logic (or the same update+trigger) rather than
  // writing status here directly, so the trigger's validation still applies uniformly.
  await supabase.from('assets').update({ status: 'Allocated' }).eq('id', v.assetId);

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'allocation.created', p_entity_type: 'allocation', p_entity_id: data.id,
    p_metadata: { asset_id: v.assetId },
  });

  return NextResponse.json({ data }, { status: 201 });
}
```

### `PATCH /api/allocations/[id]/return`
`can.allocateAsset` (Asset Manager/Admin confirm the physical check-in) — set `status = 'Returned'`, `returned_at = now()`, store `return_condition_notes` from `returnAllocationSchema`, then flip the asset back to `Available` (through the trigger-validated update). Log `allocation.returned`.

### `GET, POST /api/allocations/transfers`
- `GET`: list transfer requests, RLS-scoped.
- `POST`: any authenticated employee may request a transfer for their own allocation (`requested_by = auth.uid()`, matching the RLS policy `"employee creates transfer"`) — validate with `createTransferRequestSchema`, and reject with `404`/`403` if the caller doesn't own the referenced allocation (RLS will also reject it, but return a clean error rather than a raw insert failure).

### `PATCH /api/allocations/transfers/[id]/approve`
`can.approveTransfer`. This route's entire job is calling the existing DB function — don't reimplement its logic in TypeScript, since `approve_transfer()` already does the close-old/open-new/re-allocate atomically inside one transaction:

```typescript
// src/app/api/allocations/transfers/[id]/approve/route.ts
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await getCurrentProfile();
  if (!can.approveTransfer(profile)) return unauthorized();

  const { error } = await supabase.rpc('approve_transfer', { p_transfer_id: id, p_approver_id: profile!.id });
  if (error) return fromPostgresError(error); // e.g. P0001 "Transfer request is not pending"

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'transfer.approved', p_entity_type: 'transfer_request', p_entity_id: id, p_metadata: {},
  });

  return NextResponse.json({ success: true });
}
```

---

## 5. Bookings module

### `GET, POST /api/bookings`
- `GET`: list pattern filterable by `resourceAssetId`, `status`, and a `from`/`to` date-range for the calendar view.
- `POST`: `can.bookResource`. Validate with `createBookingSchema`, confirm the target asset has `is_bookable = true` before insert (return `400` if not — a friendlier message than letting it insert and rely purely on the exclusion constraint, since a non-bookable asset isn't a *conflict*, it's a wrong request). The actual overlap rule is the `EXCLUDE USING gist` constraint from `0006_resource_bookings.sql` — don't add an app-level overlap pre-check as the source of truth, only as a nicer error path. Catch `23P01` via `fromPostgresError` and return `409`.

```typescript
// src/app/api/bookings/route.ts (POST body)
export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.bookResource(profile)) return unauthorized();

  const parsed = createBookingSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data: asset } = await supabase.from('assets').select('is_bookable').eq('id', v.resourceAssetId).single();
  if (!asset?.is_bookable) return apiError('This asset is not bookable', 400);

  const { data, error } = await supabase.from('resource_bookings').insert({
    resource_asset_id: v.resourceAssetId,
    booked_by: profile!.id,
    booked_for_department_id: v.bookedForDepartmentId,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
  }).select().single();

  if (error) {
    return fromPostgresError(error, {
      onExclusionViolation: () => apiError('This time slot is unavailable — it overlaps an existing booking', 409),
    });
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'booking.created', p_entity_type: 'booking', p_entity_id: data.id, p_metadata: {},
  });

  return NextResponse.json({ data }, { status: 201 });
}
```

### `PATCH /api/bookings/[id]/cancel`
`can.cancelBooking` (owner, or Admin/Asset Manager/Department Head) — load the booking first to run that check (it needs `booked_by`), then set `status = 'Cancelled'`. Log `booking.cancelled`.

### `PATCH /api/bookings/[id]/reschedule`
Same permission as cancel. Validate with `rescheduleBookingSchema`, update `starts_at`/`ends_at` — the exclusion constraint re-validates automatically on update since it's a table constraint, not just insert-time. Catch `23P01` the same way as creation.

---

## 6. Maintenance module

### `GET, POST /api/maintenance`
- `GET`: list pattern, filterable by `status`, `priority`, `assetId`.
- `POST`: `can.raiseMaintenance` (any active employee). Validate with `createMaintenanceSchema`, `raised_by = profile.id`. Log `maintenance.raised`.

### `PATCH /api/maintenance/[id]/approve`
`can.approveMaintenance`. Validate with `approveMaintenanceSchema` (`decision: 'Approved' | 'Rejected'`), update `status` and `approved_by`. The DB trigger `sync_asset_status_on_maintenance()` handles flipping the asset to `Under Maintenance` automatically on `Approved` — don't also set the asset's status manually in this route, that would double-write and could race the trigger. Log `maintenance.approved` or `maintenance.rejected` based on the decision.

### `PATCH /api/maintenance/[id]/assign`
`can.approveMaintenance`. Only valid from `status = 'Approved'`; validate with `assignTechnicianSchema`, set `technician_name` and `status = 'Technician Assigned'`, then allow a follow-up transition to `'In Progress'` via the same endpoint (accept an optional `status` override in the body restricted to `['Technician Assigned', 'In Progress']` — reject anything else with 400, since `Resolved` is a distinct endpoint below and `Pending/Approved/Rejected` aren't valid targets here).

### `PATCH /api/maintenance/[id]/resolve`
`can.approveMaintenance`. Validate with `resolveMaintenanceSchema`, set `status = 'Resolved'`. The same `sync_asset_status_on_maintenance()` trigger flips the asset back to `Available` and stamps `resolved_at` — this route just needs to write the status change and let the trigger do the rest. Log `maintenance.resolved`.

---

## 7. Audits module

### `GET, POST /api/audits`
- `GET`: list audit cycles, filterable by `status`, `scopeDepartmentId`.
- `POST`: `can.manageAuditCycles`. Validate with `createAuditCycleSchema`. This needs three inserts in sequence (cycle row, `audit_cycle_auditors` rows, and one `audit_items` row per in-scope asset) — do this as sequential awaited calls inside the route rather than a client-side loop, and if any step fails, the earlier inserts should be cleaned up (wrap in a Postgres function if this gets unwieldy in app code, following the same pattern as `approve_transfer`/`close_audit_cycle` — flag this in a code comment rather than leaving partial audit data on a mid-request failure).

```typescript
// src/app/api/audits/route.ts (POST body, sketch)
export async function POST(req: NextRequest) {
  const { supabase, profile } = await getCurrentProfile();
  if (!can.manageAuditCycles(profile)) return unauthorized();

  const parsed = createAuditCycleSchema.safeParse(await req.json());
  if (!parsed.success) return apiError(parsed.error.message, 400);
  const v = parsed.data;

  const { data: cycle, error: cycleErr } = await supabase.from('audit_cycles').insert({
    name: v.name, scope_department_id: v.scopeDepartmentId, scope_location: v.scopeLocation,
    start_date: v.startDate, end_date: v.endDate,
  }).select().single();
  if (cycleErr) return apiError(cycleErr.message, 400);

  await supabase.from('audit_cycle_auditors').insert(
    v.auditorEmployeeIds.map((employee_id) => ({ audit_cycle_id: cycle.id, employee_id })),
  );

  let assetsQuery = supabase.from('assets').select('id, location');
  if (v.scopeDepartmentId) assetsQuery = assetsQuery.eq('department_id', v.scopeDepartmentId);
  if (v.scopeLocation) assetsQuery = assetsQuery.eq('location', v.scopeLocation);
  const { data: scopedAssets } = await assetsQuery;

  if (scopedAssets?.length) {
    await supabase.from('audit_items').insert(
      scopedAssets.map((a) => ({ audit_cycle_id: cycle.id, asset_id: a.id, expected_location: a.location })),
    );
  }

  await supabase.rpc('log_activity', {
    p_actor_id: profile!.id, p_action: 'audit_cycle.created', p_entity_type: 'audit_cycle', p_entity_id: cycle.id, p_metadata: {},
  });

  return NextResponse.json({ data: cycle }, { status: 201 });
}
```

### `PATCH /api/audits/[id]/verify`
This is actually per-item, not per-cycle — expect a body identifying the `audit_items` row (e.g. `{ auditItemId, verification, notes }` extending `verifyAuditItemSchema`). `can.verifyAuditItem` needs the cycle's assigned-auditor list loaded first (join `audit_cycle_auditors`) to check the caller is an assigned auditor or Admin/Asset Manager. The DB trigger `prevent_edit_after_close()` already blocks writes once the cycle is closed — catch that `P0001` via `fromPostgresError`. Set `verified_by = profile.id`, `verified_at = now()`.

### `PATCH /api/audits/[id]/close`
`can.manageAuditCycles`. This is a single call to the existing `close_audit_cycle()` function — same shape as the transfer-approval route:
```typescript
const { error } = await supabase.rpc('close_audit_cycle', { p_cycle_id: id });
if (error) return fromPostgresError(error);
await supabase.rpc('log_activity', { p_actor_id: profile!.id, p_action: 'audit_cycle.closed', p_entity_type: 'audit_cycle', p_entity_id: id, p_metadata: {} });
```
Per `AGENTS.md` Section 3 rule 6, closing is final — this route has no corresponding "reopen" counterpart; don't add one without being asked.

---

## 8. Departments, categories, employees

These three are simpler CRUD, all gated by `can.manageOrgMasterData` / `can.promoteEmployee` for writes, readable by any authenticated user per the RLS policies in `0010_rls_policies.sql`.

### `GET, POST /api/departments`
Validate `POST` with `departmentSchema` (already exists in `org-setup.schema.ts` from file 4 — reuse it, don't redeclare). Supports `parentDeptId` for the hierarchy and `head` — resolve the head's name to an `employee_profiles.id` before insert, or accept `headEmployeeId` directly if the frontend form sends an id instead of a name (flag this ambiguity to the frontend team rather than guessing; `org-setup.schema.ts`'s `head: z.string()` reads as a name, but `departments.head_employee_id` is a uuid FK — this needs one line of clarification between backend and frontend before wiring the form).

### `GET, POST /api/categories`
Validate `POST` with `categorySchema` (also already in `org-setup.schema.ts`). Note the schema's `code` field doesn't have a matching column on `asset_categories` in `0002_asset_categories.sql` (only `name` and `extra_fields` exist) — either add a `code text unique` column via a new migration (`0011_...`, additive per `AGENTS.md` Section 5, never edit `0002` directly) or drop `code` from the schema. Flag this rather than silently picking one.

### `GET, POST /api/employees`
`GET`: employee directory, filterable by `role`, `departmentId`, `status`. `POST` here is **not** how new employees are created — per `AGENTS.md` Section 3 rule 1, employees only ever come from real signup (`handle_new_user()` trigger). If a `POST` is needed at all it should be narrowly scoped to "Admin invites a pre-provisioned employee record" if the frontend team actually needs that — otherwise this route can just be `GET`-only and the `POST` stub removed. Flag this with whoever owns the Employee Directory screen before assuming which behavior it needs.

### `PATCH /api/employees/[id]/promote`
`can.promoteEmployee`. Validate with `promoteRoleSchema` (exists already). This is the **only** place role changes may happen anywhere in the codebase (rule 1) — update `role` (and `department_id` if provided) on `employee_profiles`. Log `employee.promoted` with the old and new role in metadata.

---

## 9. Notifications module

### `GET /api/notifications`
RLS (`"own notifications only"`) already restricts this to `recipient_id = auth.uid()`, so no extra manual filter is needed for that — just apply `isRead` filter and pagination if requested.

### `PATCH` for marking read
The stub file only defines `GET`/`POST` — add a `PATCH` handler (or a `PATCH /api/notifications/[id]/read` sub-route, whichever the frontend's read-status UI expects; flag this choice) to set `is_read = true`. Notifications themselves are never created directly by client `POST` — they're written by `log_activity`-adjacent flows and the `pg_cron` jobs in `3-database-schema.md`, so the `POST` verb on this stub can likely be dropped; confirm with the frontend team before removing it outright.

---

## 10. Reports module

Per the explicit instruction for this task: **no calculation, aggregation, or export logic runs in the frontend.** All three report endpoints below return already-computed, ready-to-render data.

### `GET /api/reports/utilization`
Per-asset or per-department utilization: total allocated days / total days in range. Compute this with a Postgres query (aggregate in SQL, not by pulling raw rows into JS) — e.g. `select department_id, count(*) filter (where status = 'Active') as active_count, count(*) as total_count from allocations group by department_id`, adjusted to the actual date-range params (`from`, `to`) the endpoint accepts.

### `GET /api/reports/maintenance-frequency`
Count of maintenance requests per asset/category over a date range, plus average resolution time (`resolved_at - created_at`) — again as a grouped SQL aggregate, not computed client-side.

### `GET /api/reports/booking-heatmap`
Bookings per resource per day/hour bucket for the heatmap view — `date_trunc('hour', starts_at)` grouped counts.

All three: no `POST` is actually needed for a *reports* GET-only feature — the stub files currently define both `GET` and `POST`; the `POST` handler in each can be dropped unless there's a filter-form-as-POST convention the frontend already committed to (flag it, don't assume). Exporting (CSV/PDF) is explicitly out of scope for this task per the instructions given — implement the data endpoints only; a follow-up task can add an `/export` variant once these are wired up and confirmed correct.

---

## 11. What NOT to do in this task

- Don't touch `src/app/(auth)/**`, `src/app/(dashboard)/**`, or any `.tsx` component — frontend integration is a separate, later task per the instructions given for this round.
- Don't hand-edit `supabase/migrations/*` — if Section 8's `categories.code` gap or anything else needs a schema change, add a new numbered migration file instead.
- Don't move any of the conflict/overlap/workflow rules into application code as the primary enforcement — the DB constraints and triggers from `3-database-schema.md` remain the source of truth; route handlers translate their failures into clean responses, they don't reimplement the rules.
- Don't implement CSV/PDF export or any client-side computation for the Reports screens — out of scope for this round per the assignment.
