# AGENTS.md — AssetFlow

This file is the source of truth for any AI coding agent (Antigravity, Claude Code, Cursor, Copilot Workspace, etc.) working in this repository. Read this in full before making changes. If an instruction here conflicts with a one-off prompt, treat this file as the default and the prompt as the exception — call out the conflict rather than silently picking one.

---

## 1. What this project is

AssetFlow is an Enterprise Asset & Resource Management System, built for the Odoo Hackathon (July 2026, 8-hour online format). It lets any organization (offices, schools, hospitals, factories) track physical assets and shared resources through a centralized ERP-style platform: departments, asset categories, employee directory, asset lifecycle, allocations/transfers, resource bookings, maintenance approval workflow, audit cycles, notifications, and reporting.

Out of scope, by design: purchasing, invoicing, accounting. Acquisition cost is stored only for reporting/ranking, never linked to any accounting logic.

---

## 2. Stack (do not deviate without explicit instruction)

- **Framework:** Next.js 14+, App Router, TypeScript, single repo for frontend + backend (Route Handlers / Server Actions). No separate backend service.
- **Database & Auth:** Supabase (Postgres + Supabase Auth + RLS). Chosen over MongoDB because the domain is fully relational (self-referencing department hierarchy, FK-heavy allocations/bookings/maintenance/audits) and because booking overlap validation and role-based access map naturally to Postgres constraints and RLS policies.
- **Styling/UI:** Tailwind CSS + shadcn/ui.
- **Forms/validation:** react-hook-form + zod (one schema per entity in `src/lib/validators/`).
- **State:** zustand for local/UI state only (sidebar, modals). Server state comes from Supabase queries / route handlers, not client-side global stores.
- **Notifications (in-app):** sonner for toasts; DB-backed notifications table for persistent activity feed.

Do not introduce a different ORM, a separate Express/Nest backend, or MongoDB. If a task seems to require one, stop and flag it instead of adding it silently.

---

## 3. Domain model — the rules that must never be violated

These are the actual product rules from the problem statement. Any implementation that violates one of these is a bug, even if it "works":

1. **Signup is Employee-only.** No role selection at signup, ever. Role promotion (to Department Head or Asset Manager) happens in exactly one place: Organization Setup → Employee Directory tab, by an Admin. Never expose a role picker anywhere else, including seed/test utilities that ship to the UI.
2. **Asset lifecycle states:** `Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed`. Transitions must be validated server-side (e.g. `Available ↔ Under Maintenance`, `Allocated → Available`). Don't let a client just PATCH an arbitrary status string.
3. **No double allocation.** An asset already allocated cannot be allocated again. The correct UX on conflict is: show "currently held by X" and offer a **Transfer Request**, not a generic error. Transfer workflow is `Requested → Approved (Asset Manager/Department Head) → Re-allocated`, and re-allocation must update history automatically.
4. **Booking overlap validation is server-side and authoritative**, never just a client-side calendar check. Two bookings for the same resource must not have overlapping time ranges; a booking starting exactly when another ends is valid (touching, not overlapping).
5. **Maintenance requests must be approved before the asset status flips to "Under Maintenance."** Workflow: `Pending → Approved/Rejected (Asset Manager) → Technician Assigned → In Progress → Resolved`. Status reverts to Available only on Resolved.
6. **Audit cycles are scoped (department/location, date range) with assigned auditors.** Each asset in scope gets marked `Verified / Missing / Damaged`. Closing a cycle is a distinct, final action that locks the cycle and updates asset statuses (e.g., confirmed-missing → Lost). Don't let audit results be edited after close.
7. **Overdue detection** (allocations past Expected Return Date, bookings, maintenance) must be computed server-side (a query condition or scheduled check), not just a UI label — it feeds the Dashboard KPIs and Notifications.
8. **Every state-changing action should append to the activity log** (who did what, when) — this is a cross-cutting concern, not a Screen 10-only feature.

---

## 4. Roles and permissions

| Role | Can do |
|---|---|
| Admin | Manage departments, categories, audit cycles, promote employees to Department Head / Asset Manager; view org-wide analytics |
| Asset Manager | Register/allocate assets; approve transfers, maintenance requests, audit discrepancy resolution; approve returns |
| Department Head | View department's assets; approve allocation/transfer requests within their department; book resources on department's behalf |
| Employee | View own allocated assets; book resources; raise maintenance requests; initiate return/transfer requests |

Permission checks must exist **both** client-side (hide/disable UI, good UX) **and** server-side (route handler / RLS policy, actual security). Never rely on client-side role checks alone — treat them as UX sugar only.

Central permission logic lives in `src/lib/permissions.ts`. Add new capability checks there, not inline in components.

---

## 5. Folder structure contract

The scaffold defined in `1-folder-structure.md` is authoritative. Key expectations:

- Route groups `(auth)` and `(dashboard)` under `src/app/` map 1:1 to the 10 screens in the problem statement — don't rename or restructure them without updating this file.
- API routes under `src/app/api/` mirror domain entities (`assets`, `allocations`, `bookings`, `maintenance`, `audits`, `departments`, `categories`, `employees`, `notifications`, `reports`). Business logic for conflict/overlap checks belongs in these route handlers (or a shared `lib` service they call), not duplicated in components.
- Supabase migrations in `supabase/migrations/` are numbered in dependency order (departments → categories → employees → assets → allocations → bookings → maintenance → audits → notifications → RLS). New tables get a new numbered file; don't retroactively edit an already-applied migration — add a new one.
- Types in `src/types/database.types.ts` are generated (`supabase gen types typescript`), not hand-written. Regenerate after any schema change rather than manually editing.

---

## 6. Conventions

- **TypeScript strict**, no `any` unless justified with a comment.
- **Server Components by default**; mark `"use client"` only where interactivity (forms, calendar, dialogs) requires it.
- **Validation:** every mutating endpoint validates its input with the matching zod schema from `src/lib/validators/` before touching the database — don't trust client payloads.
- **Error handling:** route handlers return meaningful HTTP status codes and a consistent `{ error: string }` shape on failure; don't leak raw Postgres error messages to the client.
- **Naming:** tables/columns snake_case in Postgres, camelCase in TypeScript; Supabase client mapping handles this — don't mix conventions within a single layer.
- **No secrets in client code.** `SUPABASE_SERVICE_ROLE_KEY` is used only in `src/lib/supabase/admin.ts`, server-side, never imported into a client component.
- **Commits:** small, scoped, imperative mood (`feat: add booking overlap check`, not `updates`).

---

## 7. What agents should NOT do without asking

- Don't add a new top-level architecture (e.g., separate backend repo, GraphQL layer, different DB).
- Don't change the asset lifecycle states or workflow transitions listed in Section 3 — they come directly from the problem statement.
- Don't remove server-side validation to "simplify" a demo — hackathon judging explicitly calls out proper ERP architecture and role-based workflows.
- Don't auto-generate large amounts of unrelated boilerplate (e.g., a full design system) when a narrow fix was requested.

---

## 8. Time-boxed hackathon context

This is an 8-hour build (9am–5pm). Prioritize, in order: (1) auth + org setup + employee directory, (2) asset registration/lifecycle, (3) allocation + conflict handling, (4) booking + overlap validation, (5) maintenance workflow, (6) audits, (7) dashboard/reports/notifications polish. If time runs short, cut polish (Reports & Analytics depth, notification reminders) before cutting the conflict/overlap validation logic — those are the rules judges will specifically test.