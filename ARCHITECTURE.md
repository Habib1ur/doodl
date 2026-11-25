# Doodlio System Architecture

## Monorepo Layout

- `apps/web`: Next.js App Router frontend (UI, HTML5 Canvas, Zustand store, Socket.IO client).
- `apps/server`: Express + Socket.IO authoritative game server.
- `packages/shared`: Shared TypeScript types, Zod validation schemas, game constants, and typed Socket.IO event interfaces.
- `prisma/`: PostgreSQL schema (`schema.prisma`) and seed script (`seed.ts`).

## Authoritative Game State

Active rooms live in-memory inside `RoomManager` (`apps/server/src/rooms/roomManager.ts`) for sub-millisecond drawing and chat latency:

1. **State Machine**: `WAITING` → `WORD_SELECTION` → `DRAWING` → `ROUND_END` → `GAME_END`.
2. **Secret Word Isolation**: `game:word-options` and `game:word-assigned` are emitted only to the current drawer's socket ID. Other players only receive masked `wordHint` updates.
3. **Normalized Canvas Protocol**: Drawing points are normalized to `[0, 1]` relative to canvas dimensions so strokes render identically across 320px mobile screens and 1920px desktops.
4. **Reconnection**: On `room:create` or `room:join`, the server issues an HMAC-SHA256 signed `sessionToken`. On browser refresh, `player:reconnect` restores the player's socket, score, chat history, and full stroke stack.

## Database Persistence

PostgreSQL (via Prisma) stores persistent data: `User`, `UserProfile`, `Match`, `MatchPlayer`, `WordCategory`, `Word`, `Achievement`, `UserAchievement`, `RoomRecord`, and `Report`. Guest play works seamlessly even without a database connection.
