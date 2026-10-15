# Studio — Foo Studio client portal

Café owners use Studio to ask for website changes and new pages through agent-ba, check before/after diffs, sign off, follow progress and manage monthly credits. This repo is the frontend for Jira tickets FS-69 … FS-84 (one ticket per screen, plus FS-69 for the shared pieces).

Built with Vite, React 18, TypeScript and CSS Modules. Designed at 1440 × 900; mobile isn't designed yet.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Sign in with **mei@kopilane.com**, PIN **123456**. Any other PIN shows the "didn't match" error. After 5 wrong tries in a minute the PIN is locked for a minute.

## Branches

Work flows `feature/*` → `development` → `uat` → `main`. Commit on a feature branch cut from `development`, never straight to the three long-lived branches. The hooks in [`.githooks/`](.githooks/README.md) enforce this locally once you run the setup commands there.

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
