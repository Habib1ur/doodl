# Doodlio Deployment Guide

## 1. Supabase (PostgreSQL)
1. Create a Supabase project.
2. Copy the **Transaction Pooler** connection string into `DATABASE_URL` and the **Direct** connection string into `DIRECT_URL`.
3. Run migrations and seed:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

## 2. Render (Backend `apps/server`)
Create a **Web Service** connected to your GitHub repository (root directory = repository root, so `@doodlio/shared` is accessible):
- **Build Command**: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm --filter @doodlio/shared build && pnpm --filter @doodlio/server build`
- **Start Command**: `pnpm --filter @doodlio/server start`
- **Health Check Path**: `/health`
- **Environment Variables**:
  - `NODE_ENV=production`
  - `PORT=4000`
  - `FRONTEND_URL=https://your-vercel-domain.vercel.app`
  - `DATABASE_URL=...`
  - `DIRECT_URL=...`
  - `SESSION_SECRET=<random-32+-char-string>`

## 3. Vercel (Frontend `apps/web`)
Import the GitHub repository in Vercel:
- **Root Directory**: `apps/web`
- **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
- **Build Command**: `cd ../.. && pnpm --filter @doodlio/shared build && pnpm --filter @doodlio/web build`
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`
  - `NEXT_PUBLIC_SOCKET_URL=https://your-render-service.onrender.com`

## 4. Post-Deployment Verification
1. Visit `https://your-render-service.onrender.com/health` and confirm `status: "ok"`.
2. Visit your Vercel URL, create a room, and join from a second device/incognito tab.
