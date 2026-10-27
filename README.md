# EcclesiaFlow — web app

The frontend for EcclesiaFlow, a church management system: members and
households, groups, events and attendance, giving, communications, a team
with roles, and a member portal. It talks to the
[EcclesiaFlow API](https://github.com/MwizerwaBit/ecclesia-flow-api) (FastAPI + PostgreSQL), which enforces
all authorization. This app only decides what to show.

## Stack

- **React 19** + **TypeScript**, built and served by **Vite** (a PWA: service worker and installable)
- **Tailwind CSS 4** with design tokens in `src/design-system/`
- **TanStack Query** for server state, **React Router 6** for routing
- Controlled forms with a small validation hook (`src/lib/validation.ts`); React Hook Form and Zod are installed but not used by the screens yet
- **oxlint** for linting

## Getting started

Requires Node 22.

```bash
npm install
cp .env.example .env.local   # then edit, see below
npm run dev                  # http://localhost:5173
```

### Pointing it at the API

| Variable | Meaning |
|---|---|
| `VITE_API_MODE` | `rest` talks to the real API. Anything else (or unset) uses in-browser mock data, no backend needed |
| `VITE_API_URL` | The API base URL, e.g. `http://localhost:8001/api/v1` |

Mock mode is for UI work only. Features that only exist on the server
(unit types, affiliations, terminology, family relationships, switching
roles, and others) show a "needs the EcclesiaFlow API" message in mock mode
instead of faking behaviour.

Run the API with `uvicorn app.main:app --port 8001` from the API repo (see its
README for the database and migrations). To reach the app from another device,
start Vite with `npx vite --host 0.0.0.0`, set `VITE_API_URL` to an address that
device can reach, and add the app's origin to the API's `CORS_ORIGINS`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint |
| `npm run audit:links` | Lists links that don't match a defined route (module routes are registry-driven, so expect noise) |
| `npm run audit:ui`, `audit:controls`, `audit:nav` | UI, dead-control and navigation audits; `audit:nav` needs a working headless browser |
| `npm run pwa:assets` | Regenerates PWA icons |

## How the code is organised

```
src/
  routes/        Screens, by audience: staff/, portal/ (members), auth/, public/,
                 onboarding/, billing/, platform/ (EcclesiaFlow admins), board/
  modules/       Registry of feature modules: drives navigation, routes and gating
  services/      One service per area. All HTTP goes through adapter.ts
  components/    ui/ primitives (Button, Card, Input, Select, BottomSheet…), plus feature components
  hooks/         useAuthStore, useRole (can('permission')) and similar
  types/         Domain types, camelCase
  design-system/ Tokens and theme
  mocks/         Mock-mode data
```

Conventions worth knowing:

- **Services and the adapter.** Components never call `fetch`. Services use
  `apiRequest` from `services/adapter.ts`, which converts snake_case and
  camelCase at the boundary, holds the 15-minute access token in memory only,
  and refreshes it from an httpOnly cookie. A service that has no mock
  behaviour calls `requireApi(...)`.
- **Feedback on every failure.** A failed mutation raises a toast automatically
  (`App.tsx`), worded by `lib/errors.ts`, which names the rejected fields on a
  422. A screen that explains the failure itself opts out with
  `meta: { inline: true }`. Forms validate with `lib/validation.ts`
  (`useFieldErrors`): messages appear when a field loses focus, update live, show
  for every field on submit, and server-side field errors land under their input.
  Don't disable a submit button to signal "invalid"; show why instead.
  `RegisterScreen.tsx` is the reference.
- **Modules.** Adding a screen means adding a route to `src/modules/registry.ts`
  with the permission it needs; navigation and gating follow from that.
- **Permissions.** `useRole().can('members:update')` hides what a person can't
  use. The server still checks every request, so treat the UI as a convenience,
  not a control.
- **Breakpoints are shifted.** `lg` is 768px (tablet). Use `xl` and `2xl` for
  desktop layouts.
- **Several roles per login.** A person can hold more than one role in a
  church. A session works under one at a time, switched from Settings →
  "Working as". What they can see follows the active role.

## Quality gates

Every pull request runs three required checks (`.github/workflows/ci.yml`):

1. **lint**: oxlint
2. **build**: `tsc -b` and `vite build`
3. **security**: `npm audit --omit=dev --audit-level=high` (no high or critical
   advisories in shipped dependencies) and a gitleaks scan of the history for secrets

Run the first three locally before pushing: `npm run lint`, `npm run build`,
and `npm audit --omit=dev --audit-level=high`.

## Branches

`feature → development → staging → master`. Open pull requests into
`development`; `master` is protected. Promotions between the long-lived
branches are pull requests with merge commits, not squashes.

## More documentation

- `docs/database-design.md`: the data model the screens are built against
- `summary.md`: product summary
- The API repo's `docs/` covers architecture, the authorization matrix and security notes
