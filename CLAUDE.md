# CLAUDE.md — AssetFlow

This file gives Claude (via Claude Code or Antigravity) the working context needed to be immediately useful in this repo. It complements `AGENTS.md`, which holds the full domain rules, folder contract, and conventions — **read `AGENTS.md` first if you haven't already this session.** This file adds Claude-specific workflow guidance on top.

---

## Quick orientation

- Project: AssetFlow — Enterprise Asset & Resource Management ERP, built for an 8-hour Odoo hackathon (July 2026).
- Stack: Next.js 14 App Router (TS), single repo for frontend + API routes, Supabase (Postgres + Auth + RLS), Tailwind + shadcn/ui, zod + react-hook-form, zustand for UI-only state.
- Full domain rules (lifecycle states, allocation conflict handling, booking overlap validation, maintenance/audit workflows, roles) live in `AGENTS.md` Section 3–4 — treat those as hard constraints, not suggestions.
- Folder scaffold is defined in `1-folder-structure.md` and mirrored in `AGENTS.md` Section 5.

---

## How to work in this repo

1. **Before editing, look at what's already there.** Given the hackathon pace, code may be scaffolded ahead of being wired up — check for existing route handlers, zod schemas, and types before writing new ones from scratch. Don't duplicate a validator or type that already exists under `src/lib/validators/` or `src/types/`.
2. **Migrations are additive.** If a schema change is needed, add a new numbered file in `supabase/migrations/` — never edit a migration that may already have been applied. After any schema change, regenerate `src/types/database.types.ts` via `supabase gen types typescript` rather than hand-editing it.
3. **Server-side is where the real rules live.** Client-side checks (disabling a button, hiding a menu item) are UX only. The actual conflict/overlap/permission enforcement must be in the route handler or an RLS policy. When implementing a feature, always ask: "if someone bypassed the UI and hit this endpoint directly, would the rule still hold?"
4. **Keep diffs scoped.** In a time-boxed hackathon, a request to "add booking cancellation" should not turn into a refactor of the booking calendar component unless asked. Prefer minimal, correct changes over speculative generalization.
5. **When something in the problem statement is ambiguous**, state the assumption you're making inline in a code comment or commit message rather than silently picking an interpretation that could conflict with judging criteria (e.g., exact wording of the allocation conflict UX, or which roles can cancel a booking).

---

## Priorities if time runs out

Follow the build order in `AGENTS.md` Section 8. If forced to cut something, cut visual polish or the Reports/Analytics screen depth before cutting: allocation conflict handling, booking overlap validation, or the maintenance approval gate. Those three are the rules most likely to be explicitly tested by judges, since the problem statement gives worked examples for each (Priya/Raj laptop conflict; Room B2 9:30–10:30 overlap example).

---

## Things to flag rather than silently do

- Any request that would introduce MongoDB, a second backend service, or move business logic client-side "to save time" — flag it, since these conflict with the architecture decision in `AGENTS.md`.
- Any request to let a user self-assign a role (Admin/Asset Manager/Department Head) at signup — this directly violates the problem statement's account-creation requirement.
- Any request to skip server-side validation on a mutating endpoint, even "just for the demo."

---

## Useful local commands

```bash
npm run dev                          # start Next.js dev server
supabase start                       # local Supabase stack
supabase db reset                    # reapply all migrations + seed.sql
supabase gen types typescript --local > src/types/database.types.ts
```