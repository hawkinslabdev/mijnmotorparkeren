# Contributing

Thank you for considering helping out. Follow the steps below to get your local environment running, then submit a pull request. If you prefer planning features or joining discussions, open or comment on an issue.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
cd mijnmotorparkeren
npm install
cp .env.example .env
```

## Development

```bash
npm run dev          # Dev server at http://localhost:4321
npm run type-check   # astro check + tsc
npm run lint         # ESLint (0 warnings allowed)
npm run format       # Prettier auto-format
```

## Build & Preview

```bash
npm run build        # Production build > ./dist/
npm run preview      # Preview production build locally
```

## Data

Gemeente and city parking data lives in `data/gemeentes/` and `data/city/`. After editing any JSON:

```bash
npm run validate:data   # Validate all JSON files
npm run generate:index  # Syncs the gemeente index
```

Data layout:

```
mijnmotorparkeren/data/
  gemeentes/{id}.json   # Full gemeente data (parking rules, boundaries)
  city/{id}.json        # City sub-area data 
```

The lite index (`/data/index.json`) is served at runtime by `src/pages/data/index.json.ts` and pre-computes `parkingStatus` so the map can colour boundaries without fetching full files.

## Docker

```bash
docker compose up --build
```

App runs on port `4321` inside the container, mapped to `3000` on the host. All `PUBLIC_*` env vars are baked in at build time as Docker `ARG`/`ENV` values.

## Tests

Unit tests (Vitest):

```bash
npm run test         # Watch mode
npx vitest run       # Single run
```

E2E tests (Playwright) — requires the dev server running:

```bash
npm run dev          # In one terminal
npm run test:e2e     # In another
npm run test:e2e:ui  # Playwright UI mode
```

Playwright mocks all network requests (gemeente index, GeoJSON boundaries, tile images) so tests run offline and fast.

## Pull Requests

- Run `npm run lint` and `npm run type-check` before opening a PR — CI will reject failures.
- Data changes must pass `npm run validate:data`.
- Keep PRs focused; one concern per PR.

Any questions? You probably know how to create an issue.