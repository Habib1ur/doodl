# Doodlio HTTP API & Socket.IO Events

## HTTP Endpoints (`apps/server`)
- `GET /health` — Server uptime, active room count, and database connectivity status.
- `GET /api/rooms/public` — List of open public rooms.
- `GET /api/leaderboard` — Top 20 registered players by total points.
- `POST /api/auth/register` — Create a registered player account (`RegisterInput`) and return a signed auth token.
- `POST /api/auth/login` — Sign in with username/password (`LoginInput`) and return a signed auth token.
- `GET /api/profile` — Fetch authenticated player's profile stats, achievements, and recent match history (`Authorization: Bearer <token>`).
- `PATCH /api/profile` — Update authenticated player's avatar (`Authorization: Bearer <token>`).
- `POST /api/reports` — Submit a moderation report for abusive chat, inappropriate drawings, cheating, or spam (`ReportInput`).

## Client → Server Socket Events
- `room:create` — Create a new room (`CreateRoomInput`).
- `room:join` — Join an existing room by 6-char code (`JoinRoomInput`).
- `room:leave` — Leave the current room.
- `room:ready` — Toggle ready status in lobby.
- `room:settings` — Update room settings (host only).
- `game:start` — Start the match (host only, min 2 players, all ready).
- `game:play-again` — Reset room to `WAITING` (host only).
- `word:select` — Drawer chooses 1 of 3 secret words.
- `drawing:start` / `drawing:move` / `drawing:end` — Normalized stroke events (drawer only).
- `drawing:undo` / `drawing:redo` / `drawing:clear` — Canvas history actions (drawer only).
- `guess:submit` / `chat:send` — Submit a guess or chat message.
- `reaction:send` — Send an emoji reaction.
- `player:reconnect` — Restore session using signed `sessionToken`.

## Server → Client Socket Events
- `room:updated`, `room:settings-updated`, `room:error`
- `game:started`, `game:phase-changed`, `game:word-options`, `game:word-assigned`, `game:hint-updated`, `game:round-ended`, `game:ended`
- `drawing:start`, `drawing:move`, `drawing:end`, `drawing:sync`, `drawing:clear`
- `guess:correct`, `chat:message`, `reaction:received`
