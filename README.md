# Doodlio — Draw it. Guess it. Own it.

A real-time multiplayer drawing and word-guessing web game built with Next.js, Express, Socket.IO, TypeScript, Tailwind CSS, and Prisma.

## Features

- **Real-time Multiplayer Rooms**: Public and private rooms with 6-character invite codes (`/room/ABCD12`).
- **Responsive HTML5 Canvas**: Smooth Bézier strokes, normalized `[0, 1]` coordinates, 12-color palette + custom picker, 5 brush sizes, eraser, undo/redo, clear, and mobile touch-lock.
- **Authoritative Game Engine**: Server-controlled state machine (`WAITING` → `WORD_SELECTION` → `DRAWING` → `ROUND_END` → `GAME_END`), 3-option secret word selection, progressive letter hints, close-guess detection, and tiered scoring.
- **English & Bengali-English Word Packs**: Built-in curated categories plus Prisma/PostgreSQL persistence for global leaderboards and match history.
- **Reconnection Support**: Signed HMAC session tokens allow players to refresh or reconnect without losing their seat, score, or canvas.
- **Light & Dark Mode**: Persistent green-and-blue design system built with Tailwind CSS and Framer Motion.

## Tech Stack

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand, React Hook Form, Zod, Lucide React
- **Backend**: Node.js, Express, Socket.IO, TypeScript, Zod, Helmet
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Monorepo**: `pnpm` workspaces + Turborepo + `@doodlio/shared`

## Local Installation

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Generate Prisma client
pnpm db:generate

# 4. Build shared types/schemas
pnpm --filter @doodlio/shared build

# 5. Start both frontend (port 3000) and backend (port 4000)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in two browser tabs to test multiplayer locally.

## Testing & Verification

```bash
pnpm typecheck
pnpm test
pnpm build
```
