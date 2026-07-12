# AssetFlow — AI Coding Agent Engineering Constitution (`skills.md`)

**Scope:** This document governs every AI coding agent (including Claude) contributing code, configuration, schema, or documentation to the AssetFlow codebase. It is not user-facing documentation and it is not a technology overview. It is a binding operating contract.

**Project context (verified from the problem statement — do not extend beyond it):** AssetFlow is an Enterprise Asset & Resource Management ERP covering department/employee/category setup, asset lifecycle tracking, allocation & transfer, shared-resource booking, maintenance approval workflows, audit cycles, notifications, and reporting. It explicitly excludes purchasing, invoicing, and accounting. Roles are Admin, Asset Manager, Department Head, Employee. No specific tech stack, database engine, repository structure, or file layout has been provided anywhere in the source material as of this writing — **treat all of these as unknown until inspected or specified.**

---

## 1. Primary Objective

Every code change must be:

| Property | Meaning in this repo |
|---|---|
| Deterministic | Same input + same repo state → same output. No randomness in business logic without an explicit, documented seed/reason. |
| Secure | No introduced vulnerability class from §5, ever, regardless of how small the change. |
| Privacy-preserving | No PII beyond what Screen 3 (Employee Directory) actually requires: Name, Email, Department, Role, Status. |
| Architecture-first | No code before the relevant module boundary and data flow is understood or explicitly designed. |
| Maintainable | A future engineer with no chat history must be able to understand *why*, not just *what*. |
| Verifiable | Every claim about "existing code does X" must be backed by an actual repository read, not memory. |
| Hallucination-free | See §2. This is the single most important rule in this document. |

---

## 2. The Core Law: Verify Before Using

> **If it was not read from the repository, fetched from an official source, or explicitly stated by the user in this conversation, it does not exist.**

Claude must **never**:

- Invent a package, library, SDK, or CLI command name
- Invent a database table, column, migration, or index name
- Invent an API route, request/response shape, or status code
- Invent a file path, module name, or directory structure
- Invent an environment variable or config key
- Invent a business rule not stated in the problem statement or repo
- Invent a permission, role capability, or workflow transition
- Infer a missing implementation and silently fill the gap
- Assume a dependency is installed because it is "common" or "usually included"
- Assume a schema shape because it "would make sense"

### 2.1 Verified Facts vs. Unverified Assumptions (AssetFlow example)

| Statement | Status | Why |
|---|---|---|
| "Assets have states: Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed" | ✅ Verified | Explicitly listed in the problem statement |
| "Asset Tag format is `AF-0001`, auto-generated" | ✅ Verified | Explicitly stated on Screen 4 |
| "Signup creates an Employee account only; no self-assigned roles" | ✅ Verified | Explicitly stated on Screen 1 & Screen 3 |
| "Assets table has a `warranty_months` column" | ❌ Unverified | Not stated — warranty is only mentioned as an *example* optional category-specific field, never confirmed as a real column |
| "The backend uses PostgreSQL" | ❌ Unverified | No database engine specified anywhere in the source material |
| "There is a `POST /api/v1/assets/allocate` endpoint" | ❌ Unverified | No API surface has been defined yet — this must be *designed and confirmed*, not assumed to already exist |

### 2.2 When Information Is Missing — Mandatory Stop Sequence

1. **Stop.** Do not continue generating code that depends on the missing fact.
2. **Name the gap explicitly.** State exactly what is unknown.
3. **Attempt repository inspection first** (search for existing schema/config/route definitions).
4. **If inspection does not resolve it, ask the user.** Do not guess in the meantime.

Approved response templates when uncertain:

- "I cannot verify this from the repository."
- "This package cannot be verified against its official registry/docs."
- "This endpoint does not exist in the current codebase."
- "This table/column is not defined anywhere I can find — please confirm the schema or point me to the migration."
- "This business rule is not stated in the problem statement or the repo. Please confirm before I implement it."

Never substitute silence, a plausible guess, or a "reasonable default" for a genuine unknown in **schema, permissions, API contracts, or business rules**. (Reasonable, stated defaults are acceptable for pure implementation details — e.g., variable naming — but never for the categories above.)

---

## 3. Dependency & Supply-Chain Security Policy

### 3.1 Anti-Slopsquatting / Anti-Typosquatting Checklist

Before adding **any** dependency, Claude must verify, in order:

1. **Existence** — the package name resolves on the actual official registry (npm, PyPI, crates.io, etc.), not assumed from memory.
2. **Publisher identity** — the maintainer/org matches the expected, well-known publisher for that library.
3. **Name similarity risk** — check for near-identical names (e.g., `express` vs `expresss`, `lodash` vs `lodahs`) and confirm the exact spelling against the registry page, not recollection.
4. **Official documentation** — a real docs site or README exists and describes matching functionality.
5. **Repository authenticity** — linked source repo is the genuine upstream, not a fork impersonating it.
6. **Maintenance status** — recent releases/commits; not abandoned (flag if last release is unusually old).
7. **License compatibility** — license is compatible with AssetFlow's licensing (confirm with user if unknown).
8. **Known security advisories** — check for open CVEs / advisories against the exact version being pinned.
9. **Version pinning** — pin to an exact, verified-latest-stable version; never a floating range added "for convenience."

### 3.2 Dependency DO / DON'T

| DO | DON'T |
|---|---|
| Verify a package on its official registry before suggesting it | Suggest a package name from memory without checking |
| Prefer packages already used elsewhere in the repo for the same concern | Add a second library that duplicates an existing one's purpose |
| Pin exact versions and record why the dependency is needed | Use `latest`/unpinned ranges for anything security-relevant |
| Flag abandoned or unmaintained packages to the user | Silently install something unmaintained |
| Ask before adding an unofficial fork | Substitute a fork for the real package without explicit approval |

**If a package cannot be verified, the correct output is: "This package cannot be verified" — not a best-effort guess.**

---

## 4. Privacy Policy

AssetFlow's own scope statement is the ceiling for what personal data is legitimate to collect. Screen 3 defines the Employee Directory fields as: **Name, Email, Department, Role, Status.** Anything beyond that is out of scope unless the user explicitly requests it.

Rules:

- **Data minimization** — never add PII fields (phone, address, DOB, government ID, biometric, etc.) unless explicitly requested and justified.
- **Need-to-know access** — allocation history, audit findings, and maintenance notes are visible only to roles defined in §7, not broadcast globally.
- **No sensitive data in logs** — never log full employee records, passwords, tokens, or session identifiers in plaintext.
- **Data retention** — allocation history and audit history are explicitly required to be retained (per problem statement); do not silently prune history without explicit retention rules from the user.
- **Encryption in transit and at rest** — credentials, session tokens, and any exported reports containing PII must be handled accordingly.
- **No hidden telemetry / analytics / secret collection** — AssetFlow's own Reports & Analytics screen is the only sanctioned analytics surface; do not bolt on third-party trackers without explicit approval.
- **GDPR-friendly defaults** — support the idea of data correction/removal for employee records where technically reasonable; flag to the user if a request implies retention conflicts with a stated deletion need.

---

## 5. Security Policy

### 5.1 Authentication & Authorization (mapped to AssetFlow's actual role model)

AssetFlow's verified role model (do not invent additional roles):

| Role | Assigned by | Verified capabilities |
|---|---|---|
| **Admin** | System (first-class, not self-assigned at signup) | Organization Setup (departments, categories, employee directory), promotes Employees → Department Head / Asset Manager, org-wide analytics |
| **Asset Manager** | Promoted by Admin only | Register/allocate assets, approve transfers, approve maintenance requests, approve returns & condition check-ins |
| **Department Head** | Promoted by Admin only | View department's allocated assets, approve allocation/transfer requests within department, book shared resources on department's behalf |
| **Employee** | Default at signup | View own allocated assets, book shared resources, raise maintenance requests, initiate return/transfer requests |

**Critical, explicitly-stated rule: signup must never allow self-assigned or self-elevated roles.** Every account starts as Employee. Role changes happen **only** through the Admin-driven Employee Directory (Screen 3, Tab C). Any code path that lets a client-supplied field set `role=admin` (or any elevated role) at signup or via a generic "update profile" endpoint is a **critical vulnerability** and must be rejected outright, not "fixed later."

Standard requirements:

- Enforce authorization checks **server-side**, on every request, never trust client-submitted role/permission claims.
- Least privilege by default — a new endpoint defaults to the most restrictive role unless the problem statement says otherwise.
- Secure session handling: session validation on every protected request (per Screen 1: "session validation" is an explicit requirement).
- Forgot-password flow must not leak whether an email exists (avoid user enumeration) — standard secure default unless explicitly told otherwise.

### 5.2 OWASP Top 10 / CWE-Aligned Rules

| Threat | Rule for this repo |
|---|---|
| Injection (SQL/NoSQL/Command) | Parameterized queries / ORM query builders only. Never string-concatenate user input into a query or shell command. |
| Broken Access Control | Every allocation/transfer/maintenance/audit action must re-check the actor's role and resource ownership server-side, matching §5.1 exactly — never trust UI-hidden buttons as the security boundary. |
| Cryptographic Failures | Passwords hashed with a modern adaptive algorithm (e.g., bcrypt/argon2 family) — never plaintext or reversible encryption for passwords. Never invent a hashing scheme; use a verified, standard library. |
| Insecure Design | Conflict rules (double-allocation, booking overlap) must be enforced at the **data/service layer**, not only in the UI, so a direct API call can't bypass them. |
| Security Misconfiguration | No default admin credentials, no debug mode in shipped config, no verbose stack traces returned to clients. |
| Vulnerable Components | Apply the dependency policy in §3 before adding or upgrading anything. |
| Identification & Auth Failures | Rate-limit login/forgot-password endpoints; lock or throttle after repeated failures. |
| Software & Data Integrity Failures | No unsigned/unverified script execution in CI; verify dependency provenance per §3. |
| Logging & Monitoring Failures | Log security-relevant events (login failures, role changes, permission denials) without logging secrets. |
| SSRF | Any server-initiated fetch of a user-supplied URL (e.g., photo/document links) must validate/allow-list destinations. |

### 5.3 Additional Hard Requirements

- **CSRF** protection on all state-changing endpoints.
- **XSS**: encode all output rendered into HTML/templates; never trust "it's just an internal tool."
- **Path Traversal**: validate and sandbox any file path derived from user input (relevant for asset photo/document uploads on Screen 4 and maintenance photo attachments on Screen 7).
- **Secure file uploads**: validate MIME type and size server-side, store outside the web root or in object storage with access control, never trust the client-reported file extension alone.
- **Secrets management**: all credentials/API keys via environment variables or a secrets manager — never hardcoded, never committed.
- **Audit logging**: Screen 10 explicitly requires "full audit log of admin/manager/employee actions (who did what, when)" — every state-changing action across allocation, transfer, maintenance, booking, and audit modules must emit an audit log entry.
- **Rate limiting** on authentication and any bulk-action endpoints.

---

## 6. Code Generation Rules

| DO | DON'T |
|---|---|
| Modify existing code where a matching module already exists | Duplicate logic that already exists elsewhere in the repo |
| Follow the repository's existing patterns, naming, and structure once observed | Introduce a new architectural pattern without reason |
| Ask/inspect before assuming a helper/utility exists | Assume a utility function exists because "it probably does" |
| Keep business logic exactly as specified (e.g., booking overlap: a slot starting exactly when another ends is valid) | Simplify or "improve" stated business rules without approval |
| Write explicit, readable code over clever one-liners | Over-abstract a single-use case into a generic framework |
| Generate complete, production-quality code for the stated scope | Leave TODOs/stubs presented as if they were finished implementations |
| Preserve behavior of unrelated code paths | Refactor unrelated code "while you're in there" |

### 6.1 Two Concrete Business Rules That Must Never Be Softened

These are stated precisely in the problem statement — implement them exactly, do not approximate:

1. **Allocation conflict rule:** An asset already allocated to someone cannot be allocated to someone else. The blocked user must be shown who currently holds it and offered a **Transfer Request** action instead of a generic error.
2. **Booking overlap rule:** Two bookings for the same resource may not have overlapping time ranges. A booking that starts exactly when the previous one ends is **valid** (not an overlap) — e.g., 9:00–10:00 blocks 9:30–10:30 but not 10:00–11:00. Implement this as a half-open interval check (`[start, end)`), not an inclusive range check.

---

## 7. Architecture Rules

- **Layered architecture**: presentation → application/service → domain → data access, with clear boundaries. Do not let UI code talk directly to the database layer.
- **Separation of concerns per AssetFlow module**: Organization Setup, Asset Registry, Allocation/Transfer, Booking, Maintenance, Audit, Notifications/Logs, and Reports should be distinct, loosely-coupled modules — because the problem statement itself models them as distinct screens/domains with their own workflows.
- **Single Responsibility**: e.g., the code that validates booking overlaps should not also be responsible for sending the reminder notification — those are separate concerns even if triggered by the same event.
- **Dependency inversion**: domain/business logic should not depend on framework or infrastructure details directly; depend on interfaces/abstractions where the existing repo convention supports it.
- **Explicit interfaces** between modules (e.g., how Maintenance triggers an asset status change to "Under Maintenance" should be an explicit, named integration point, not an implicit side effect buried in an unrelated function).
- **State machine discipline for Asset Lifecycle**: the states (Available, Allocated, Reserved, Under Maintenance, Lost, Retired, Disposed) and their transitions must be modeled explicitly (e.g., an enum + an explicit transition table/guard), not scattered `if` checks across the codebase. Only implement transitions actually stated or clearly implied by the problem statement (e.g., Available ↔ Under Maintenance, Allocated → Available); do not invent additional transitions (e.g., "Disposed → Available") without explicit confirmation.

---

## 8. Database Rules

- **No destructive migrations without explicit approval** — no dropping columns/tables, no irreversible data transformations, without the user confirming first.
- **Explicit foreign keys** for all relationships implied by the domain (Department ↔ Employee, Asset ↔ Category, Asset ↔ Allocation, Resource ↔ Booking, Asset ↔ Maintenance Request, Audit Cycle ↔ Asset/Auditor).
- **Indexes** on fields used for the stated search/filter requirements (Asset Tag, Serial Number, QR code, category, status, department, location — per Screen 4).
- **Referential integrity** enforced at the database level, not only in application code.
- **Transaction safety**: allocation, transfer, and booking operations that check-then-write (e.g., "is this asset already allocated?" then "allocate it") must be wrapped in a transaction with appropriate locking/isolation to prevent race conditions — this directly protects the double-allocation and double-booking rules in §6.1.
- **Validation at both layers**: application-level validation for UX, database-level constraints (NOT NULL, CHECK, FK, UNIQUE) as the actual source of truth.
- **Never invent a schema.** If the actual schema/migrations are not visible in the repo, say so and ask, or propose a schema explicitly as a *proposal* clearly labeled as such — never present an invented schema as if it already exists.

---

## 9. API Rules

- **Versioning**: all new endpoints under an explicit version prefix once one is established in the repo; if none exists yet, raise this as a decision to confirm with the user rather than picking one silently.
- **Consistent response envelope and error format** across all endpoints — match whatever convention already exists in the repo; if none exists, propose one explicitly rather than inventing per-endpoint formats.
- **Authentication & authorization** enforced on every endpoint per §5.1 role table.
- **Validation**: reject malformed/missing required fields before touching business logic or the database.
- **Pagination, filtering, sorting** on list endpoints (asset directory, employee directory, booking calendar, audit history, logs) since these are explicitly described as searchable/filterable in the problem statement.
- **Idempotency** where applicable — e.g., a retried "approve maintenance request" call should not double-apply the state transition.
- **Never fabricate an endpoint.** If asked to "call the endpoint that approves a transfer," and no such endpoint exists yet, say so and either locate the real one or propose creating it explicitly.

---

## 10. Testing Rules

| Test type | Required coverage in this repo |
|---|---|
| Unit | State machine transitions (asset lifecycle), conflict/overlap logic (§6.1), role-permission checks |
| Integration | Allocation → notification pipeline, maintenance approval → asset status change, audit closure → status update for missing/damaged items |
| End-to-end | Signup → Employee-only role → Admin promotion flow (validates the non-self-elevation rule) |
| Regression | Any bug fix must include a test that would have caught the original bug |
| Security | Authorization bypass attempts (e.g., Employee calling an Asset-Manager-only endpoint directly), injection payloads on all input fields |
| Performance | Booking overlap checks and allocation checks under concurrent requests (race condition coverage, per §8) |

- Validation (tests + lint + type-check, matching whatever is configured in the repo) must pass before any change is presented as complete.
- Do not claim test coverage exists unless tests were actually written and actually run.

---

## 11. Error Handling

- Errors returned to clients must be **actionable and consistent** (e.g., "Asset AF-0114 is currently held by Priya Sharma — request a transfer instead" rather than a generic 400).
- **Never expose stack traces, internal paths, query text, or secrets** in client-facing error responses.
- Log full error detail server-side; return a safe, sanitized message to the client.
- Distinguish validation errors (client-fixable) from system errors (not client-fixable) consistently.

---

## 12. Observability

- **Structured logging** (not free-text string concatenation) for all state-changing actions.
- **Audit logs** per §5.3 — mandatory, not optional, given Screen 10's explicit requirement.
- **Metrics** for operationally meaningful events: overdue allocations, overdue bookings, pending maintenance approvals, audit discrepancies — since these directly feed the Dashboard KPI cards described in Screen 2.
- **Health checks** for any service boundary introduced.
- **Notifications as a first-class observability surface**: Screen 10's notification types (Asset Assigned, Maintenance Approved/Rejected, Booking Confirmed/Cancelled/Reminder, Transfer Approved, Overdue Return Alert, Audit Discrepancy Flagged) must be triggered from the actual state transitions they describe — not simulated or hardcoded.

---

## 13. AI Reasoning Policy — Mandatory Pre-Coding Sequence

Before writing **any** code, Claude must internally work through:

1. **Repository inspection** — what actually exists right now (files, modules, schema, conventions)?
2. **Architecture understanding** — where does this change fit in the layered structure (§7)?
3. **Dependency verification** — per §3, is anything new being introduced, and is it verified?
4. **Existing implementation search** — does similar logic already exist that should be reused/extended?
5. **Business rule verification** — does this match the problem statement exactly (especially §6.1 rules)?
6. **Security review** — does this introduce any §5 risk, especially around role/permission checks?
7. **Edge case analysis** — race conditions on allocation/booking, boundary times on overlap checks, empty/null states.
8. **Backward compatibility review** — does this break an existing consumer of this code/API?
9. **Performance review** — any obvious N+1 queries, missing indexes, or unbounded loops?
10. **Final validation** — does the output satisfy §10 testing expectations?

**Only after this sequence may code be generated.**

---

## 14. Decision Making Under Multiple Valid Implementations

When more than one implementation approach is viable, prefer the option that, in this priority order:

1. Minimizes complexity
2. Preserves the existing architecture (§7)
3. Reduces security risk (§5)
4. Improves long-term maintainability
5. Avoids technical debt
6. Follows repository conventions already observed

**Always state the tradeoff explicitly** — e.g., "Option A (application-level locking) is simpler but has a small race-condition window under high concurrency; Option B (database-level row locking) closes that window but requires transaction support in the current data layer. Recommending B for the allocation-conflict rule in §6.1 because correctness matters more than simplicity here."

---

## 15. When Uncertain — Required Phrasing

Do not soften, hedge into a guess, or "helpfully" fill gaps. Use direct, explicit statements:

- "I cannot verify this from the repository."
- "This package cannot be verified."
- "This endpoint does not exist."
- "This table/column is not defined in any migration I can find."
- "This business rule is not stated in the problem statement or the repo — please confirm before I implement it."
- "This implementation requires clarification: [specific question]."

---

## 16. Final Engineering Checklist (Complete Mentally Before Every Code Generation Task)

- [ ] Did I actually read the relevant repository files, or am I recalling from memory?
- [ ] Is every package/library I'm using verified against its official registry (§3)?
- [ ] Does every table/column/endpoint I reference actually exist, or have I flagged it as a proposal?
- [ ] Does this change enforce role/permission checks server-side, matching §5.1 exactly?
- [ ] Does this preserve the exact allocation-conflict and booking-overlap semantics in §6.1?
- [ ] Have I avoided introducing any OWASP Top 10 class vulnerability (§5)?
- [ ] Have I avoided collecting or logging PII beyond what's defined in §4?
- [ ] Does this fit the existing layered architecture, or have I explained a deviation (§7, §14)?
- [ ] Are transactions/locking in place anywhere a check-then-write race condition is possible (§8)?
- [ ] Have I written or updated tests appropriate to §10?
- [ ] Are error messages actionable and free of leaked internals (§11)?
- [ ] Does this state-changing action emit an audit log entry / trigger the correct notification (§12)?
- [ ] Have I flagged every unverifiable assumption instead of guessing (§2, §15)?
- [ ] Have I stated tradeoffs explicitly if multiple valid approaches existed (§14)?

If any box cannot be honestly checked, **stop and surface the gap before proceeding.**
