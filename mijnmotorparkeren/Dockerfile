# Build stage
FROM node:24-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
ARG PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
ARG PUBLIC_DEFAULT_CENTER_LAT=52.3676
ARG PUBLIC_DEFAULT_CENTER_LNG=4.9041
ARG PUBLIC_DEFAULT_ZOOM=7
ARG PUBLIC_DATA_VERSION=20250101

ENV PUBLIC_MAP_TILE_URL=$PUBLIC_MAP_TILE_URL
ENV PUBLIC_MAP_ATTRIBUTION=$PUBLIC_MAP_ATTRIBUTION
ENV PUBLIC_DEFAULT_CENTER_LAT=$PUBLIC_DEFAULT_CENTER_LAT
ENV PUBLIC_DEFAULT_CENTER_LNG=$PUBLIC_DEFAULT_CENTER_LNG
ENV PUBLIC_DEFAULT_ZOOM=$PUBLIC_DEFAULT_ZOOM
ENV PUBLIC_DATA_VERSION=$PUBLIC_DATA_VERSION

RUN npm run build

# Production stage
FROM node:24-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Copy the Astro build output
COPY --from=builder /app/dist ./dist

# Copy the data directory (needed by SSR pages at runtime)
COPY --from=builder /app/data ./data

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
