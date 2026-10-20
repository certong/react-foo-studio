# Studio — Foo Studio client portal

Café owners use Studio to ask for website changes and new pages through agent-ba, check before/after diffs, sign off, follow progress and manage monthly credits. This repo is the frontend for Jira tickets FS-69 … FS-84 (one ticket per screen, plus FS-69 for the shared pieces).

Built with Vite, React 18, TypeScript and CSS Modules. Designed at 1440 × 900; mobile isn't designed yet.

## Run it

```sh
npm install
cp .env.example .env   # local backends; gitignored
npm run start          # http://localhost:5182, mock API
npm run build          # typecheck + build
```

### Configuration

There is one env file: `.env`, gitignored, for local development only. Copy [`.env.example`](.env.example) to make it — that file documents every key. The values are public, because everything `VITE_`-prefixed ships in the browser bundle, so none of them is a secret.

| Key | Local default | What it is |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3002` | Studio API (nest-foo-studio); routes are `/portal/...`, no `/api` prefix |
| `VITE_AUTH_URL` | `http://localhost:3001` | nest-foo-auth host; the app calls `${VITE_AUTH_URL}/api/auth/...` |
| `VITE_USE_MOCK_API` | `true` | Keeps the screens on the built-in mock until they're wired to the real API |
| `VITE_USE_MOCK_AUTH` | `false` | `true` signs in with the built-in demo account instead of nest-foo-auth |

**Deployed environments aren't configured here, because Studio has no deploy target yet.** When it gets one, the plan is react-foo-billing's: hand the hosts to the app at runtime so a single build serves development, UAT and production. Per-mode `.env.development` / `.env.uat` / `.env.production` files are deliberately gone — they baked a host into the bundle and needed a rebuild to change one. The hosts that are already known are recorded in `.env.example` for whoever wires that up.

`npm run build` only requires the two URLs when `VITE_USE_MOCK_API=false`, so a clean checkout with no `.env` still builds on the mock; turning the mock off is what makes a real backend mandatory. The dev server always runs on port **5182** — the studio origin nest-foo-auth allows — and refuses to start if that port is taken, so it can't silently drift.

Sign-in goes to **nest-foo-auth** with email + password (FS-87). The access token is held in memory, and Foo-Auth's 12-hour refresh cookie keeps you signed in across reloads. Use `localhost`, never `127.0.0.1`: that cookie is `SameSite=Lax` and only comes back when this app is same-site with the auth host — which also means a deployed auth host won't keep you signed in locally, so run nest-foo-auth on 3001 with its database. With no auth service at all, set `VITE_USE_MOCK_AUTH=true` and use the demo account **mei@kopilane.com** / **kopilane**. Email + PIN, "remember this device" and Welcome back need FA-23 in nest-foo-auth first.

## Branches

Work flows `feature/*` → `development` → `uat` → `main`.

1. Cut a feature branch from `development`, commit there and push it.
2. Open a pull request into `development`. Later PRs go `development` → `uat` and `uat` → `main`.
3. Pull the long-lived branches; don't merge into them locally.

On GitHub, branch protection requires pull requests, and the **Branch flow** check ([`.github/workflows/branch-flow.yml`](.github/workflows/branch-flow.yml)) rejects a PR from the wrong branch. Locally, the hooks in [`.githooks/`](.githooks/README.md) block direct commits once you run the setup commands there.

## API contract

The Studio API's contract is `openapi.json` in nest-foo-studio (FS-85). This repo generates its types from it:

```sh
npm run api:types   # → src/api/schema.d.ts (committed; never edit by hand)
npm run mock:api    # contract-shaped replies on :4010 (add `Prefer: code=402` for an error)
```

Both read `../../Nest/nest-foo-studio/openapi.json` by default; set `OPENAPI_FILE` if your checkout lives elsewhere. A contract change happens in nest-foo-studio (`npm run openapi`), then you regenerate here.

- [`src/api/client.ts`](src/api/client.ts) is the typed client (`openapi-fetch`). It sends a Bearer token and uses `VITE_API_BASE_URL`. The six money and publish POSTs need an `Idempotency-Key` header; their types make it required, and `idempotencyKey()` makes one.
- [`src/data/types.ts`](src/data/types.ts) re-exports contract types (`RequestCard`, `Step`, `StepState`, `StatusKey`, …).
- Screens render `badge` and `steps[]` from the data and never map statuses themselves. Only the badge colour and icon are set in the UI, keyed by `statusKey`.

## Mock API

There's no backend yet. [`src/api/studio.ts`](src/api/studio.ts) is a mock API that keeps its data in memory, saves it to `localStorage` (`studio.data.v2`) and adds realistic delays. [`src/api/auth.ts`](src/api/auth.ts) does the same for sign-in. Screens only use these async calls, so a real backend can replace them without touching the screens.

"Today" is fixed to Wed 14 Oct 2026 so the seed data matches the designs (`DEMO_TODAY` in [`src/lib/date.ts`](src/lib/date.ts)).

### Demo switches

Add these to the URL to reach states that are hard to get to by clicking:

| Flag | Effect |
|---|---|
| `?demo=reset` | Restore the seed data |
| `?demo=low-credits` | 10 free credits, so sending a change goes to **13 Not enough credits** |
| `?demo=offline` | The next chat message fails once, to show the offline state and **Try again** |
| `?demo=empty` | Home, Requests and Past requests with no data |
| `?demo=caught-up` | Home with nothing waiting on you |
| `/credits?layout=dial` | The alternative dial layout for Credits |
| `/credits?ledger=long` | A busy month, to show **Show all N** |
| `/kit` | Sheet of every shared component in each of its states |

## Screens

| # | Screen | Route | Ticket |
|---|---|---|---|
| 01 | Sign in | `/sign-in` | FS-70 |
| 02 | Welcome back | `/welcome` | FS-71 |
| 03 | Home | `/` | FS-72 |
| 04 | Requests | `/requests` | FS-73 |
| 04b | Past requests | `/requests/past` | FS-74 |
| 05 | Credits | `/credits` | FS-75 |
| 06 | Chat: start | `/chat` | FS-76 |
| 07 | Chat: change | `/chat/:id` (text change) | FS-77 |
| 08 | Chat: new page | `/chat/:id` (new page) | FS-78 |
| 09 | Before / after | `/requests/:id/review` | FS-79 |
| 10 | Page sign-off | `/chat/:id/sign-off` | FS-84 |
| 11 | Preview review | `/requests/:id/preview` | FS-80 |
| 12 | Request progress | `/requests/:id` | FS-81 |
| 13 | Not enough credits | `/chat/:id/not-enough-credits` | FS-82 |
| 14 | Empty and error states | `/states` | FS-83 |

## Where things live

- `src/styles/tokens.css`: design tokens (type, colour, status, step dots, shape, motion)
- `src/components/`: shared pieces (TopBar, Button, Badge, StepTracker, SegmentedSwitch, Layout, Chat, States, Toast)
- `src/screens/`: one folder per screen
- `src/lib/`: status, step, request and date helpers
- `src/data/seed.ts`: Kopi Lane demo data and prices

All motion switches off under `prefers-reduced-motion`.
