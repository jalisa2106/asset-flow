# 1 — Folder Structure Setup (AssetFlow)

**Goal:** Prepare the complete initial folder/file scaffold for the AssetFlow project so the first commit represents a clean, production-shaped architecture — not a default `create-next-app` dump.

**Stack decision (do not deviate):**
- Framework: **Next.js 14+ (App Router)** — single repo, frontend + backend (API routes / Server Actions) combined.
- Database/Auth: **Supabase (Postgres)** — chosen over MongoDB because the domain is fully relational (departments hierarchy, employees, assets, allocations, bookings, maintenance, audits) and because booking overlap validation and RBAC via Auth + RLS are natively supported.
- Styling: Tailwind CSS + shadcn/ui (fast to scaffold, consistent components across 10 screens).
- Language: TypeScript throughout.

---

## Step 1 — Initialize the Next.js app

Run this at the root of the already-created repo (do not create a nested folder):

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --eslint
```

Answer prompts: Yes to `src/`, Yes to App Router, No to Turbopack customization (default is fine).

Then install core dependencies:

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install lucide-react
npm install zustand
npm install sonner
npx shadcn@latest init
```

---

## Step 2 — Full directory structure to create

Create the following structure exactly. Empty folders should contain a `.gitkeep` file so they persist in the initial commit even before code is added.

```
assetflow/
├── .env.local.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── middleware.ts                      # Supabase session refresh + route protection
│
├── supabase/
│   ├── config.toml
│   ├── seed.sql                       # demo data: departments, categories, employees, assets
│   └── migrations/
│       ├── 0001_departments.sql
│       ├── 0002_asset_categories.sql
│       ├── 0003_employee_profiles.sql
│       ├── 0004_assets.sql
│       ├── 0005_allocations_transfers.sql
│       ├── 0006_resource_bookings.sql
│       ├── 0007_maintenance_requests.sql
│       ├── 0008_audit_cycles.sql
│       ├── 0009_notifications_activity_log.sql
│       └── 0010_rls_policies.sql
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx                            # redirects to /login or /dashboard
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx                    # Screen 1
│   │   │   ├── signup/
│   │   │   │   └── page.tsx                    # Screen 1 (Employee-only signup)
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                      # sidebar + topbar shell, role-aware nav
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                    # Screen 2 - KPI cards, overdue, quick actions
│   │   │   │
│   │   │   ├── organization/                   # Screen 3 (Admin only)
│   │   │   │   ├── page.tsx                    # tab shell
│   │   │   │   ├── departments/
│   │   │   │   │   └── page.tsx                # Tab A
│   │   │   │   ├── categories/
│   │   │   │   │   └── page.tsx                # Tab B
│   │   │   │   └── employees/
│   │   │   │       └── page.tsx                # Tab C - role promotion happens here
│   │   │   │
│   │   │   ├── assets/                         # Screen 4
│   │   │   │   ├── page.tsx                    # directory + search/filter
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                # register asset
│   │   │   │   └── [assetId]/
│   │   │   │       ├── page.tsx                # asset detail
│   │   │   │       └── history/
│   │   │   │           └── page.tsx            # allocation + maintenance history
│   │   │   │
│   │   │   ├── allocations/                    # Screen 5
│   │   │   │   ├── page.tsx                    # active allocations list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                # allocate asset (conflict check UI)
│   │   │   │   └── transfers/
│   │   │   │       └── page.tsx                # transfer request queue
│   │   │   │
│   │   │   ├── bookings/                       # Screen 6
│   │   │   │   ├── page.tsx                    # calendar view
│   │   │   │   └── new/
│   │   │   │       └── page.tsx                # book resource (overlap validation)
│   │   │   │
│   │   │   ├── maintenance/                    # Screen 7
│   │   │   │   ├── page.tsx                    # request list / workflow board
│   │   │   │   └── new/
│   │   │   │       └── page.tsx                # raise request
│   │   │   │
│   │   │   ├── audits/                         # Screen 8
│   │   │   │   ├── page.tsx                    # audit cycle list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                # create audit cycle
│   │   │   │   └── [auditId]/
│   │   │   │       └── page.tsx                # auditor verification screen + discrepancy report
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   └── page.tsx                    # Screen 9
│   │   │   │
│   │   │   └── notifications/
│   │   │       └── page.tsx                    # Screen 10 - notifications + activity log
│   │   │
│   │   └── api/
│   │       ├── assets/
│   │       │   ├── route.ts                    # GET (list/search/filter), POST (register)
│   │       │   └── [assetId]/
│   │       │       ├── route.ts                # GET/PATCH single asset
│   │       │       └── status/
│   │       │           └── route.ts            # lifecycle transition endpoint
│   │       ├── allocations/
│   │       │   ├── route.ts                    # POST allocate (conflict check server-side)
│   │       │   ├── [id]/return/route.ts
│   │       │   └── transfers/
│   │       │       ├── route.ts
│   │       │       └── [id]/approve/route.ts
│   │       ├── bookings/
│   │       │   ├── route.ts                    # POST booking (overlap check server-side)
│   │       │   └── [id]/
│   │       │       ├── cancel/route.ts
│   │       │       └── reschedule/route.ts
│   │       ├── maintenance/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── approve/route.ts
│   │       │       ├── assign/route.ts
│   │       │       └── resolve/route.ts
│   │       ├── audits/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── verify/route.ts
│   │       │       └── close/route.ts
│   │       ├── departments/route.ts
│   │       ├── categories/route.ts
│   │       ├── employees/
│   │       │   ├── route.ts
│   │       │   └── [id]/promote/route.ts       # only place role assignment happens
│   │       ├── notifications/route.ts
│   │       └── reports/
│   │           ├── utilization/route.ts
│   │           ├── maintenance-frequency/route.ts
│   │           └── booking-heatmap/route.ts
│   │
│   ├── components/
│   │   ├── ui/                                 # shadcn generated primitives (button, dialog, etc.)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── RoleGate.tsx                    # conditionally renders by role
│   │   ├── dashboard/
│   │   │   ├── KpiCard.tsx
│   │   │   └── OverdueList.tsx
│   │   ├── assets/
│   │   │   ├── AssetForm.tsx
│   │   │   ├── AssetTable.tsx
│   │   │   ├── AssetStatusBadge.tsx
│   │   │   └── AssetHistoryTimeline.tsx
│   │   ├── allocations/
│   │   │   ├── AllocationForm.tsx
│   │   │   ├── ConflictDialog.tsx              # "currently held by X" + Transfer button
│   │   │   └── TransferRequestCard.tsx
│   │   ├── bookings/
│   │   │   ├── BookingCalendar.tsx
│   │   │   └── BookingForm.tsx
│   │   ├── maintenance/
│   │   │   ├── MaintenanceForm.tsx
│   │   │   └── MaintenanceWorkflowBoard.tsx
│   │   ├── audits/
│   │   │   ├── AuditCycleForm.tsx
│   │   │   ├── AuditorVerificationGrid.tsx
│   │   │   └── DiscrepancyReport.tsx
│   │   ├── organization/
│   │   │   ├── DepartmentForm.tsx
│   │   │   ├── CategoryForm.tsx
│   │   │   └── EmployeeDirectoryTable.tsx
│   │   └── notifications/
│   │       └── NotificationItem.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                       # browser client
│   │   │   ├── server.ts                       # server client (cookies-based)
│   │   │   └── admin.ts                        # service-role client (server-only actions)
│   │   ├── validators/                         # zod schemas per entity
│   │   │   ├── asset.schema.ts
│   │   │   ├── allocation.schema.ts
│   │   │   ├── booking.schema.ts
│   │   │   ├── maintenance.schema.ts
│   │   │   └── audit.schema.ts
│   │   ├── permissions.ts                      # role → allowed actions map
│   │   ├── constants.ts                        # enums: AssetStatus, BookingStatus, etc.
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useUser.ts
│   │   ├── useRole.ts
│   │   └── useNotifications.ts
│   │
│   ├── types/
│   │   ├── database.types.ts                   # generated via `supabase gen types typescript`
│   │   ├── asset.ts
│   │   ├── allocation.ts
│   │   ├── booking.ts
│   │   ├── maintenance.ts
│   │   ├── audit.ts
│   │   └── index.ts
│   │
│   └── store/
│       └── uiStore.ts                          # zustand: sidebar state, active modals, etc.
│
└── public/
    └── icons/
```

---

## Step 3 — Root-level files to create now

**`.env.local.example`**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**`.gitignore`** — ensure it includes:
```
.env.local
node_modules
.next
supabase/.branches
supabase/.temp
```

**`README.md`** — one paragraph project description (copy the Overall Vision section from the problem statement) + setup steps (`npm install`, `supabase start`, `npm run dev`).

---

## Step 4 — Rules for this commit (do not touch / do not implement yet)

- **Do NOT write business logic** in this pass. Every `page.tsx` and `route.ts` should be a minimal placeholder (a heading + "TODO" comment, or a stub `NextResponse.json({ status: 'not implemented' })`).
- **Do NOT write migration SQL bodies yet** — create the migration files empty (or with a one-line comment header naming the table they'll hold) so the sequence/order is locked in for later commits.
- **Do NOT install MongoDB-related packages** — Supabase only.
- Keep `middleware.ts` as a stub that just refreshes the Supabase session; route-protection logic comes in a later commit.
- Every folder in the tree above must exist after this step, even if only holding a placeholder file, so the first commit's diff clearly shows the whole architecture at a glance.

---

## Step 5 — Commit

```bash
git add .
git commit -m "chore: scaffold AssetFlow project structure (Next.js + Supabase)"
git push origin main
```
