# sandeshak-web

React web app for [Sandeshak](../README.md) — a secure, real-time chat application.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build tool | Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| Linting | ESLint + Prettier |
| Git hooks | Husky + lint-staged |

## Prerequisites

- Node.js 20+
- `sandeshak-server` running locally (see [server README](../sandeshak-server/README.md))

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env

# 3. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api/v1` | REST API base URL |
| `VITE_WS_URL` | `http://localhost:3000` | WebSocket server URL |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint and auto-fix |
| `npm run format` | Format `src/` with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run type-check` | Run TypeScript compiler check |

## Project Structure

```
src/
├── components/
│   └── ProtectedRoute.tsx   # Redirects unauthenticated users to /login
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ChatPage.tsx
│   └── NotFoundPage.tsx
├── types/
│   └── index.ts             # Mirror of sandeshak-server/src/types/index.ts
├── App.tsx                  # Router definition
├── index.css                # Tailwind CSS entry
└── main.tsx                 # React root
```

## Routes

| Path | Page | Auth required |
|------|------|---------------|
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/` | ChatPage | Yes |
| `*` | → `/404` | — |

## Code Quality

Husky runs `lint-staged` on every commit:
- **ESLint fix** + **Prettier** on `src/**/*.{ts,tsx}`
- **Prettier** on `src/**/*.css`

## Shared Types

`src/types/index.ts` is a manual mirror of `sandeshak-server/src/types/index.ts`.  
When the server API contract changes, copy the updated file across:

```bash
cp ../sandeshak-server/src/types/index.ts src/types/index.ts
```

## Related Repositories

- [`sandeshak-server`](../sandeshak-server) — Node.js + Express + Socket.io
- [`sandeshak-mobile`](../sandeshak-mobile) — React Native (Expo)
