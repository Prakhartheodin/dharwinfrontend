# Dharwin Frontend (`uat.dharwin.frontend`)

Next.js frontend for ATS/HRM features, candidate workflows, settings/admin modules, meetings, and dashboards.

## Overview

- Framework: Next.js (`next@16`)
- Language: TypeScript + React
- UI stack: Tailwind + Sass + component libraries
- State/data: Redux Toolkit + axios
- Integrations: LiveKit, SignalR, backend REST APIs

## Prerequisites

- Node.js (recommended current LTS)
- npm
- Running backend service (`uat.dharwin.backend`) for local API access

## Quick Start

1. Install dependencies:
   - `npm install`
2. Configure env:
   - update `.env` (or create it from your team template)
3. Start dev server:
   - `npm run dev`

Default local URL is `http://localhost:3001`.

## Scripts

- `npm run dev` — start Next.js dev server on port `3001`
- `npm run build` — production build
- `npm run start` — start built app
- `npm run lint` — lint checks
- `npm run audit:ci` — npm security audit (`high` threshold)
- `npm run generate-templates` — generate app templates
- `npm run postcss` — compile SCSS and run postcss
- `npm run sass` / `npm run sass-min` — compile Sass assets

## Environment Variables

Typical local setup in `.env`:

- `NEXT_PUBLIC_API_URL=http://localhost:3000/v1/`
- `NEXT_PUBLIC_LIVEKIT_URL=...`
- `NEXT_PUBLIC_HRM_WEBRTC_BACKEND_URL=...`
- `NEXT_PUBLIC_PM_ASSISTANT_ENABLED=true|false`

Notes:

- `next.config.js` rewrites `/api/v1/*` to backend origin (from `NEXT_PUBLIC_API_BACKEND_URL` / `BACKEND_URL` / `NEXT_PUBLIC_API_URL` fallback).
- OAuth callback routes under `/v1/email/auth/.../callback` are also proxied to backend to avoid local callback 404s.

## Project Structure

- `app/` — Next.js app router pages and layouts
- `public/` — static assets, SCSS/CSS, icons/media
- `redux/` (and related store files) — state management
- `docs/` — frontend documentation and plans
- `next.config.js` — rewrites, runtime/frontend build behavior

## Documentation

Start here:

- [`docs/README.md`](./docs/README.md) — full frontend docs index

Useful docs:

- [`docs/PERMISSION_FLOW.md`](./docs/PERMISSION_FLOW.md)
- [`docs/AUTH_FIX_DOCUMENTATION.md`](./docs/AUTH_FIX_DOCUMENTATION.md)
- [`docs/MEETINGS_SETUP.md`](./docs/MEETINGS_SETUP.md)

Backend docs:

- [`../uat.dharwin.backend/README.md`](../uat.dharwin.backend/README.md)
- [`../uat.dharwin.backend/docs/README.md`](../uat.dharwin.backend/docs/README.md)

## Local Development Tips

- Keep frontend `3001` + backend `3000` for standard local flow.
- If API requests fail in browser:
  - verify backend is running
  - verify `NEXT_PUBLIC_API_URL`
  - verify rewrite target in `next.config.js`
- If OAuth callback pages fail locally:
  - ensure callback rewrite routes are present and backend origin is correct

## Troubleshooting

- **Build succeeds with hidden type errors**
  - `next.config.js` currently has `typescript.ignoreBuildErrors: true`; run stricter checks in CI or manually as needed.
- **Assets/styles not updating**
  - rerun Sass/PostCSS scripts or restart dev server.
- **Auth/session inconsistencies**
- confirm frontend origin and backend CORS/cookie settings align.
