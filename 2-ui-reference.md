# 2 — UI Reference (from Excalidraw mockup)

This file translates the Excalidraw/PNG/SVG mockup into concrete per-screen build notes. Use this alongside `AGENTS.md` (rules) and `1-folder-structure.md` (file locations) — this file is about **layout and component shape**, not business logic, which is already defined elsewhere.

General layout across all authenticated screens: fixed left sidebar (`Dashboard, Organization setup, Assets, Allocation & Transfer, Resource Booking, Maintenance, Audit, Reports, Notifications`) + main content pane. Sidebar active item is highlighted. This maps to `(dashboard)/layout.tsx` + `components/layout/Sidebar.tsx`.

---

## Screen 1 — Login / Signup

- Single centered card, max-width ~400px, rounded corners.
- Fields: Email, Password, "Forgot password" link right-aligned under password.
- Divider, then "New here?" section with a short line explicitly telling the user **signup creates an Employee account, admin roles assigned later** — this line must appear in the UI copy, not just in code comments. It's a product requirement, not decoration.
- "Create Account" as a secondary/outline button below the primary login button.
- Component: `app/(auth)/login/page.tsx` handles both login and signup in one card (toggle or two routes — either is fine, but keep the "roles assigned later" copy on signup).

---

## Screen 2 — Dashboard

- "Today's Overview" heading, then a 2-row KPI grid: row 1 = Available / Allocated / (Reserved or a 4th available count per mockup), row 2 = Active Bookings / Pending Transfers / Upcoming Returns. Build as a reusable `KpiCard.tsx` in a responsive grid, not 6 hardcoded divs.
- A distinct red/warning banner below the KPI grid for overdue items ("N assets overdue for return — flagged for follow-up") — this should be visually separated from the KPI grid, not just another card.
- Three quick-action buttons in a row: **+ Register asset**, **Book resource**, **Raise request** — route to Screen 4/6/7 creation flows respectively.
- "Recent Activity" list below — plain text feed, most recent first (this is a lightweight preview of Screen 10, not the full notifications page).

---

## Screen 3 — Organization Setup (Admin only)

- Top of content area: 3 tab-style buttons — **Departments / Categories / Employees** — plus a **+ Add** button top-right that's context-aware (adds a department, category, or employee depending on active tab).
- Departments tab: table with columns `Department | Head | Parent Dept | Status`, Status rendered as a pill badge (Active = filled dark, Inactive = outline). Parent Dept column shows `—` when none (root-level dept), enabling the hierarchy.
- Footer note text on this screen matters functionally, not just cosmetically: editing a department here drives the picklists used in Screens 4 & 5 (asset registration's department field, allocation's department field) — make sure those picklists are fed from the same `departments` table/query, not duplicated static lists.
- Categories and Employees tabs follow the same table pattern; Employees table is where the **promote to Department Head / Asset Manager** action lives (per AGENTS.md Section 3, rule 1) — this is the only place that control should render.

---

## Screen 4 — Asset Registration & Directory

- Top bar: search input ("Search by tag, serial, or QR code…") spanning most of the width + **+ Register Asset** button top-right.
- Filter row directly below search: `Category | Status | Department` as filter dropdowns/pills.
- Table columns: `Tag | Name | Category | Status | Location`. Status should use the same badge component as elsewhere (color per lifecycle state — suggest a consistent mapping, e.g. green=Available, blue=Allocated, amber=Under Maintenance, gray=Retired/Disposed, red=Lost).
- Clicking a row goes to `assets/[assetId]/page.tsx` (detail) with a link/tab to `history/page.tsx`.

---

## Screen 5 — Asset Allocation & Transfer (conflict block — build this exactly as shown, it's the headline interaction)

- Asset picker at top (searchable select, shows "AF-0114 — Dell laptop" style label).
- **When the asset is already allocated**, render a red/danger banner directly below the picker with two lines: "Already Allocated to {holder} ({department})" and "Direct re-allocation is blocked — submit a transfer request below." This is not a toast/alert dialog — it's an inline banner that stays on the page.
- Below the banner: a **Transfer Request** form, always inline on this same page (not a separate modal): `From` (pre-filled, read-only, current holder), `To` (employee select), `Reason` (textarea), **Submit Request** button.
- Below that: "Allocation history" as a plain reverse-chronological text list (date — action — actor — note), e.g. "Mar 12 — Allocated to Priya Shah — Engineering" / "Jan 09 — Returned by Arjun Nair — condition: good."
- Build `ConflictDialog` naming aside — per the mockup this renders inline, not as an actual dialog/modal component. Name the component for what it does (`AllocationConflictBanner.tsx`) rather than forcing it into a Dialog primitive.

---

## Screen 6 — Resource Booking

- Resource name + selected date as a header bar ("Conference room B2 — Tue, 7 Jul").
- Vertical time-axis calendar (hourly rows, e.g. 9:00–5:00) with existing bookings rendered as filled blocks showing requester + time range ("Booked — Procurement Team — 9 to 10").
- **Overlap rejection is shown directly on the calendar**, not as a separate error message: render the attempted/rejected slot as a dashed-outline block in red with inline text ("Requested 9:30 to 10:30 — conflict — slot is unavailable") positioned at the correct time offset, overlapping the existing booking visually so the conflict is self-evident.
- "Book a slot" button below the calendar opens the booking form (new/page.tsx).
- Build the calendar as its own component (`BookingCalendar.tsx`) that accepts existing bookings + an optional "attempted" slot to render the conflict state — this makes the overlap validation feedback reusable for both the create flow and any reschedule flow.

---

## Screen 7 — Maintenance Management (Kanban, not a list)

- Build as a **5-column Kanban board**: `Pending | Approved | Technician Assigned | In Progress | Resolved` — this is a specific layout choice in the mockup, not a table/list. Each column is a vertical stack of cards.
- Each card shows: asset tag + short name, and a one-line issue/status detail (e.g. "AF-0062 Projector bulb not turning on", "AF-873 Chair repair resolved 7 Jul"). Resolved-column cards render in a visually distinct (e.g. green/success) style.
- Footer note on this screen is functional: approving a card moves the asset to Under Maintenance; resolving moves it back to Available — this must trigger the actual status-transition API call, not just a visual column move. Treat the drag/move action (or an approve/resolve button on the card) as the trigger for the server-side status update in `AGENTS.md` Section 3 rule 5.
- Component: `MaintenanceWorkflowBoard.tsx`, one `MaintenanceCard` sub-component reused across columns.

---

## Screen 8 — Asset Audit

- Header block: audit cycle name + scope + date range, plus assigned auditors listed ("Q3 audit: Engineering dept — 1–15 Jul", "Auditors: A. Rao, S. Iqbal").
- Flat table below: `Asset | Expected Location | Verification`, where Verification is a per-row badge/dropdown (`Verified / Missing / Damaged`) the auditor sets directly in the row — no separate per-asset form/page needed.
- Below the table: a discrepancy summary banner, auto-generated, not manually written ("2 assets flagged — discrepancy report generated automatically").
- **Close audit cycle** button at the very bottom — this is a distinct, final, non-undoable action per AGENTS.md rule 6; disable/hide row editing once closed.

---

## Screen 9 — Reports & Analytics

- Two charts side by side: bar chart ("Utilization by department") and line chart ("Maintenance Frequency"). Keep this to a lightweight charting lib (e.g. `recharts`) — no need for a heavy dashboard framework given the time budget.
- Below the charts, two plain-text list sections side by side: "Most-used assets" and "Idle assets" (each a short ranked list with a one-line stat, e.g. "Room B2: 39 bookings this month worth of use").
- Below that: "Assets due for maintenance / nearing retirement" as another plain list.
- An export action (button, greyed/placeholder is fine if export isn't finished in time) sits at the bottom.
- This screen is read/aggregate-only — no forms, no mutations. Good candidate to cut polish on if time runs short (per AGENTS.md Section 8), but keep at minimum the two charts + due-for-maintenance list since those are explicitly named in the problem statement.

---

## Screen 10 — Activity Logs & Notifications

- Filter pills at the top (`All / Unread / [type filters]`) — simple toggle buttons, not a dropdown.
- Flat reverse-chronological feed below, each item = icon/color-coded dot + one-line description + relative timestamp ("Laptop AF-0114 assigned to Priya Shah — 2h ago", "Transfer approved: AF-0033 to Facilities dept — 5h ago", "Audit discrepancy flagged: AF-0891 damaged — 2d ago").
- Each notification type should map to a consistent color/icon per AGENTS.md's notification examples list (Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged) — build one `NotificationItem.tsx` that takes a `type` prop and resolves styling from a shared map, not per-type one-off components.

---

## Shared component notes (cut across screens)

- **Status/verification badges** (asset lifecycle, booking status, department active/inactive, audit verification) should all resolve through one shared `StatusBadge`-style component with a color map keyed by domain + value, so color logic isn't duplicated four different ways across screens 3/4/6/8.
- **Inline conflict/warning banners** (Screen 5 allocation conflict, Screen 6 booking overlap) share the same visual language (dark red/danger surface, two-line message) — worth one shared `InlineConflictBanner.tsx` even though their trigger logic differs.
- Keep tables consistent: same header styling, same row-click affordance, same empty-state message pattern across Screens 3/4/8.
