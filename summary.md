# EcclesiaFlow Frontend — Build Summary

What got built, fixed, and deliberately left alone across this pass, and why. Written for whoever picks this codebase up next — a teammate, or a future session with no memory of this one.

Every change below is a real git commit on this repo (`git log --oneline` for the list) and was verified against the running app — not just type-checked — using the project's own `scripts/ui-audit.mjs` (a puppeteer-driven layout/content checker) at mobile/tablet/desktop widths, plus `tsc -b` and `oxlint` kept at zero warnings throughout, not just zero errors.

---

## Starting point

A **frontend-only** React 19 + Vite + Tailwind 4 SaaS church-management app (react-router, zustand, react-query, mock services standing in for a backend — see `src/services/adapter.ts`). ~95 screens already scaffolded across public marketing, auth, onboarding, a staff admin app, a member portal, a board/network layer, and a platform-admin layer. No backend, no git history, and a brief that read as if written without knowledge of how much already existed.

First move was an audit, not code: four parallel research passes established what was actually real vs. hardcoded vs. missing, before touching anything. That audit is what the phase breakdown below is based on.

---

## Database design (not implemented, just designed)

**`docs/database-design.md`** — a PostgreSQL schema for the backend this frontend will eventually talk to, grounded in the types and mock services that already exist (every table in it maps to a `src/types/` interface). Covers:

- **Shared-database multi-tenant isolation** via Postgres Row-Level Security on every tenant table, keyed off a session-scoped `tenant_id`, plus a separate `bypassrls` role for the platform-admin path.
- **A user changing church** (`tenant_memberships`, one row per user-per-church — switching is a lookup, not a data migration) vs. **a congregant transferring church** (`member_transfers`, the one deliberately cross-tenant table, with a single-transaction set-based procedure rather than a row-by-row copy loop).
- A unified RBAC+ABAC model (`roles`/`role_permissions` + `unit_scope_id`) that Phase 3 below implements the frontend half of.

Nothing in this file has been built yet — it's the reference the backend should be built against.

---

## Phase-by-phase

### Phase 1 — Mobile bottom-nav bug + Card corner rule
The bug wasn't padding — `StaffLayout`/`MemberLayout` used `min-h-screen` (a *minimum*) instead of a bounded height, so the inner scroll region never actually capped, the whole document scrolled instead, and content could end up under the fixed tab bar. Fixed by switching to `h-dvh overflow-hidden`. Two screens (Donation Entry, Bulk Issue Certificates) also had their own `fixed bottom-0` action bar fighting the tab bar for the same screen edge — replaced both with a new shared `StickyActionBar` component.

Also fixed the "card with a colored left border must have square left corners" rule at the source: `Card` gained an `accent` prop instead of every call site hand-rolling `border-l-4` + still getting rounded corners. Wired `StaffDashboard` (previously 100% hardcoded) to the real `members/events/finance/comms` services.

### Phase 2 — Members section
`membersService.getById`/`update` **ignored the `:id` parameter entirely** — every profile page secretly showed the same hardcoded person, and the Edit button had no handler at all. Fixed the lookup, added a real edit route (`MemberForm.tsx`, shared between add/edit like the existing `CreateEditEvent` pattern). `HouseholdView` had the same ignored-`:id` bug (hardcoded `.slice(0,4)` of the whole roster as a fake "family") — now backed by a real `Household` record with an honest "no household on file" state for the ~16 of 18 members who don't have one. CSV export (PII + giving data) had zero permission check despite the permission map already marking it board-only — gated it. Sacraments got its own profile tab. Added a shared `Skeleton` primitive for loading states.

### Phase 3 — RBAC/ABAC enforcement
The permission map in `useRole.ts` already distinguished board-only permissions from staff — nothing enforced it. Any staff account could reach Structure/Analytics/Team/org-settings by nav or direct URL. Gated each with the permission that already existed, hid the corresponding nav items per role. Reconciled the two previously-disconnected permission systems (a session's resolved custom-role permissions now take precedence over the static role default). Added one real ABAC enforcement point: a unit-scoped session's Members directory filters to that unit's subtree, with a dev-switcher role ("Staff (Media, scoped)") to actually test it live.

### Phase 4 — Church leadership transfer
Nothing modeled who the accountable "church leader" was, or how that would change — not a stub, not a route. Added `TeamMember.isLeader` (distinct from role/permissions) and a full flow: nominate a successor → step-up MFA (new shared `MfaStepUpPrompt` component) → sign-off from 2 other active staff (never the outgoing leader or the nominee) → leader flag flips. Lives at `/staff/team/leadership`.

### Phase 5 — Church-selection landing
The existing landing page is EcclesiaFlow's own SaaS marketing site — correct, but a different concern from "a visitor looking for their own church." Added `/churches` (search/browse) → `/c/:slug` (that church's own page) → `/c/:slug/calendar`, via a new `churchDirectoryService` deliberately separate from the privileged `platformService`. Suspended/canceled orgs 404 like they don't exist.

### Phase 6 — Reusable media picker
Four independent dead "Upload X" buttons (avatar, org logo, certificate background, document library) became one `MediaPicker` component + `mediaService`, using `URL.createObjectURL` so an upload genuinely previews with no backend needed. Worth knowing: an earlier version tried a label/htmlFor-associated custom trigger to avoid passing a ref through a render-prop, and that *looked* fine but didn't actually open the file chooser in testing (a `<button>` nested in a `<label>` doesn't reliably forward activation) — caught via Puppeteer's file-chooser interception, not by eye. Landed on a shared `useMediaUpload` hook that owns only the mutation; every trigger keeps its own local ref.

### Phase 7 — Shared EventCard
The staff gatherings list only made the title text a link (easy to miss); the portal's upcoming-events list already did it right (whole card, explicit chevron). Extracted the portal version into `components/events/EventCard.tsx` and moved staff onto it instead of the reverse.

### Phase 8 — Long-tail cleanup
`RegisterScreen` was a content-free "Get Started" splash, not a signup form — rewritten as a real registration (church name, leader's name/email/password) backed by a new `authService.register`, directly serving the brief's "onboarding begins with registering the church leader." This **surfaced a real bug**: `PublicLayout` redirects any authenticated session away from auth screens, and the instant registration set a session, it raced the `navigate('/onboarding')` call and sometimes won — bouncing the new leader straight to the dashboard before the wizard ever rendered. Fixed by moving onboarding out from under `PublicLayout` entirely and passing the new session through router state instead of setting it before navigating. `OnboardingWizard`'s fake `setTimeout` submission now actually updates the session and calls the real members/events services for its optional steps. Replaced a native `alert()` in `MyGiving` with an honest in-app confirmation. Added a handful of missing empty states (`ContributionStatements`, `PlatformAdminUsers`, `IssueCertificate`'s member search).

### Phase 9 — Final consistency pass
No new fixes needed — a full re-sweep (all staff/portal/board/platform/public routes × 3 viewports) plus grep-based checks (no stray `border-l-*` outside `Card`, no duplicate file-input implementations, zero leftover `alert()`/`confirm()` calls) confirmed everything from phases 1–8 held together.

### Follow-up — the portal giving/profile data gap
Phase 8's own summary flagged `PortalHome`/`MyGiving` as still showing placeholder numbers because no mock member record existed for the portal demo login. Closed properly: added `Member.userId` (implementing what `docs/database-design.md` already specified, not inventing it), a real member record + donation history for the portal demo user, and the two lookups that were actually missing — `membersService.getByUserId()` and `financeService.listDonationsByMember()`. Caught two more bugs in the process: an effect that synced fetched data into local state (oxlint's `set-state-in-effect` — fixed by reading from the query directly instead of copying it), and a save handler that invalidated-and-refetched after `update()`, which would have silently reverted the save because `update()` doesn't persist in the mock layer (consistent with every other `update()` in this app) — fixed by writing the mutation's response straight into the query cache.

---

## New shared building blocks

| Added | Purpose |
|---|---|
| `components/layout/StickyActionBar.tsx` | In-page bottom action bar that floats above the mobile tab bar instead of fighting it |
| `components/ui/Skeleton.tsx` | Loading-state primitive |
| `components/ui/MfaStepUpPrompt.tsx` | Re-auth gate for a sensitive in-session action |
| `components/media/MediaPicker.tsx` + `useMediaUpload.ts` | The one upload/library mechanism, used everywhere media is attached |
| `components/events/EventCard.tsx` | The one event-card shape, staff and portal |
| `services/churchDirectoryService.ts` | Unauthenticated church lookup — deliberately separate from the privileged `platformService` |
| `services/mediaService.ts` | Backs `MediaPicker` |
| `Card`'s `accent` prop | The left-border-accent pattern, fixed at the source instead of per-page |

## Known gaps — flagged, not silently skipped

- **Platform announcements history** (`PlatformAnnouncements.tsx`) is still a hardcoded array — lower priority per the original audit, not reached this pass.
- **`SecuritySettings`/`ApiIntegrations`** still have hardcoded session/key lists alongside otherwise-real functionality.
- **`GivingReports`** trend chart is explicitly-commented fake data pending a real reporting endpoint.
- **Church-leader succession without the leader's cooperation** (the former leader unreachable/departed) isn't modeled — only the voluntary handoff flow exists. Said out loud in the Phase 4 work rather than guessed at.
- **The onboarding wizard's "first member/first event" steps** call the real `members`/`events` services, but those `create()` calls don't persist into the shared mock lists — the same non-persisting-mock limitation that applies to every `create()`/`update()` call in this app, not something unique to onboarding.

## Orientation

- Routes: `src/routes/index.tsx` is the single router config; `src/routes/layouts/*` are the shell components per audience (staff/member/board/platform/public).
- Services: `src/services/*` — the swap point for a real backend (`adapter.ts`'s `API_MODE`).
- Design system: `src/components/ui/*` (primitives), `src/design-system/tokens.ts` (the only place raw values should live).
- Verification tooling: `scripts/ui-audit.mjs` — run it against any route list with a role and viewport (`mobile`/`tablet`/`desktop`) to catch overflow, hidden-under-fixed-nav content, and missing headings before trusting a screen is done.
