# MijnMotorParkeren — Maintainer Notes

## Stack

- **Astro 5** (SSR, `output: 'server'`) with `@astrojs/node` standalone adapter
- **React 19** islands via `client:only="react"`
- **Leaflet / react-leaflet** for the interactive map
- **Tailwind CSS 4** for styling
- **Zustand** for client-side state (map position, selected gemeente)
- **Node.js 24** in production (Docker, `node:24-slim`)

## Environment Variables

Create a `.env` file in `mijnmotorparkeren/` to run locally:

```env
PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
PUBLIC_DEFAULT_CENTER_LAT=52.3676
PUBLIC_DEFAULT_CENTER_LNG=4.9041
PUBLIC_DEFAULT_ZOOM=7
PUBLIC_DATA_VERSION=YYYYMMDD
```

## Development Scripts

```bash
npm run dev                   # Start Astro dev server
npm run build                 # Production build + generate sitemap
npm run preview               # Preview production build locally

npm run generate:boundaries   # Generate gemeente boundaries from OSM
npm run validate:data         # Validate all data files
npm run sync:gemeentes        # Sync gemeente index (pre-computes parkingStatus)
npm run format                # Format code
npm run lint                  # Lint code
```

## Data Layout

```
public/data/
  index.json              # Lightweight gemeente index (~50 KB); parkingStatus pre-computed
  gemeentes/{id}.json     # Full gemeente data (parking rules, boundaries) — loaded on demand
  city/{id}.json          # City sub-area data — loaded on demand
  city/index.json         # City index (id + parent) — loaded by CityBoundariesLayer
```

Full gemeente/city JSON files are only fetched when a user selects a location. The index is fetched once on app start and shared via a module-level singleton promise.

## Docker

```bash
docker compose up --build
```

The app runs on port `4321` inside the container, mapped to `3000` on the host. All `PUBLIC_*` env vars are baked in at build time as Docker `ARG`/`ENV` values.
