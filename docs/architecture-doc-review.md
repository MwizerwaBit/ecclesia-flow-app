# Review: Ecclesia_ChMS_Architecture.docx.md vs. what's actually built

That document (`C:\Dev\ecclesia-flow\Ecclesia_ChMS_Architecture.docx.md`) is a parallel,
earlier-or-separately-written product architecture brief. It wasn't used to build this
codebase, and in a few places it describes a different system than the one that exists
here. This is a record of where it was checked against the real implementation, what
was kept, what was discarded as conflicting, and what it introduced that was worth
adopting.

## Discarded — conflicts with decisions already made deliberately

- **Schema-per-tenant PostgreSQL isolation.** The doc specifies one schema per tenant.
  The actual backend (`ecclesia-flow-api`) uses a single shared schema with Postgres
  Row-Level Security instead — a deliberate choice (see that repo's
  `docs/database-design.md` and `docs/SECURITY_NOTES.md`), not an oversight. Rewriting
  to schema-per-tenant now would throw away a working, tested isolation model for a
  different one with no stated advantage for this project's scale.
- **Microservices architecture** (14 independent services, Kafka event bus,
  Kubernetes, Kong/AWS API Gateway, Elasticsearch, Redis Cluster, Cloudflare Workers
  per tenant domain). The real backend is a FastAPI modular monolith
  (`app/modules/<name>/...`), per `plan.md`'s own "Strict Domain Scaffolding"
  guardrail — which the architecture doc elsewhere doesn't acknowledge. A microservice
  rewrite isn't warranted at current scale and isn't what's running.
- **Auth0 / Keycloak** as the identity provider. Auth is custom-built already: argon2
  password hashing, JWT access tokens, rotating refresh tokens with theft detection,
  and TOTP MFA with single-use backup codes — all implemented and integration-tested.
  Swapping to a third-party IdP would be a regression, not an upgrade.
- **Renamed core tables** (`persons` instead of `members`, `org_nodes` instead of
  `hierarchy_units`, `tenants`/`tenant_settings` instead of `organizations`,
  `household_members` as a many-to-many join instead of `members.household_id`).
  The existing schema was built to match the frontend's already-shipped types
  (`src/types/*.ts`) and mock services — per the standing rule from the start of this
  project ("the existing codebase is the source of truth, never invent"). Renaming now
  would break that contract for no behavioral gain.

## Already implemented, close enough to the doc's intent — no change made

- **Pastoral confidentiality.** The doc calls for a `pastoral_access` flag that blocks
  even an Org Admin from pastoral notes without explicit grant, enforced at the data
  layer. `CustomRoleBuilder.tsx` already marks `pastoral_notes:read`/`write` as
  `sensitive: true` (a `ShieldAlert` icon + a running "of which sensitive" count in the
  summary card), and the default role permission map only grants it to `board`, not
  `staff` — the same practical effect via a different, already-working mechanism.
- **White-label theming, mobile-first bottom nav, calm/progressive-disclosure design
  language** — all already how this app is built; the doc's "Five Design Values"
  section reads as a description of the existing design system, not a gap.

## Adopted — identified a real, missing piece

The doc's UI/UX Philosophy section calls for "offline-tolerant PWA with service
workers," pull-to-refresh, and a reactive Offline state with "cached data still
visible" and a "sync indicator when reconnected." None of that existed — this app had
zero PWA scaffolding (no manifest, no service worker, no connectivity detection) and
only a static `/offline` page nobody was ever redirected to. That gap is real and is
what this pass actually built (see below). Pull-to-refresh specifically is *not* done
— identified, not invented: a generic version would need per-route "what does refresh
mean here" wiring to be worth the gesture-handling risk, so it's left as a follow-up
rather than bolted on superficially.

---

# What changed: offline-first implementation

- **Installable PWA** via `vite-plugin-pwa` (`vite.config.ts`): generated manifest
  (`EcclesiaFlow`, indigo theme `#4338CA`, standalone display), real icon set
  generated from the existing brand mark (`public/favicon.svg`) via
  `@vite-pwa/assets-generator` (`npm run pwa:assets` to regenerate), and a Workbox
  service worker precaching the full app shell (145 entries / ~995KB at last build) so
  the SPA itself loads with zero network after the first visit.
- **`index.html`** gained the manifest link, apple-touch-icon, `theme-color`, and
  `viewport-fit=cover` — the last one is a real bug fix, not decoration: the app
  already used `.pt-safe`/`.pb-safe` utilities (`env(safe-area-inset-*)`) in several
  places, but without `viewport-fit=cover` those environment variables are always zero
  on every device, so that safe-area handling was silently inert until now.
- **`useOnlineStatus`** (`src/hooks/useOnlineStatus.ts`) and **`OfflineBanner`**
  (`src/components/ui/OfflineBanner.tsx`): a single global indicator mounted once in
  `App.tsx` (not per-layout — it floats above whichever layout is active), showing
  "You're offline — showing saved data" while offline and a brief "Back online" on
  reconnect, exactly the doc's "sync indicator when reconnected."
- **React Query cache persistence** (`@tanstack/react-query-persist-client` +
  `@tanstack/query-sync-storage-persister` in `App.tsx`): the query cache is mirrored
  to `localStorage` and `gcTime` extended to 24h, so a reload with no network restores
  real, previously-fetched data instead of an empty state.
- **Verified, not assumed** (see git history for the throwaway test scripts used,
  since deleted per this repo's usual discipline): built the app, served the
  production bundle, went fully offline via DevTools network emulation, and
  **reloaded the page** — it rendered the real church directory list from the
  persisted cache, not a blank screen or the browser's own offline error page.
- **Mutations already queue offline for free.** TanStack Query's default
  `networkMode: 'online'` pauses (doesn't fail) a mutation started while offline and
  fires it automatically on reconnect — true for every existing `useMutation` in this
  app with no code changes needed. Verified live on staff donation entry: submitting
  while offline left the button disabled with `status: 'pending', isPaused: true` in
  the mutation cache; reconnecting completed it and the batch total updated correctly.
  `OfflineBanner` now surfaces this via `useMutationState` ("· 2 changes waiting to
  sync") so a paused action doesn't look like a hung button.
- **Honest connectivity gating where it matters.** Member online giving
  (`MyGiving.tsx`) is the one action that genuinely can't work offline (real money
  movement needs a real payment processor, which isn't connected yet per the existing
  honesty pattern on that screen) — its submit button is now disabled while offline
  with inline copy explaining why, rather than silently queuing a charge. Staff
  donation entry (`DonationEntry.tsx`) is the opposite case — recording a count that
  already happened in the room — and is deliberately left queueable, matching the
  doc's own Phase 2 roadmap line: "Donations: offline entry."
