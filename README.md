# PulseChat — Real-Time Chat Portfolio Project

Original TypeScript rebuild inspired by the architecture. It keeps React + Redux + Redux-Saga + WebSockets, then extends the project with authentication, PostgreSQL persistence, rooms, optimistic UI, typing indicators, presence, read receipts, reconnect logic, validation, Docker and CI.

## Stack
- React 19 + TypeScript + Vite
- Redux Toolkit + Redux-Saga
- Node.js + Express + `ws`
- PostgreSQL + Prisma
- JWT + bcrypt
- Zod validation
- Docker Compose
- Vitest + GitHub Actions

## Run
1. `docker compose up -d db`
2. `cd server && cp .env.example .env && npm install`
3. `cd server && npx prisma migrate dev --name init && npm run dev`
4. New terminal: `cd client && npm install && npm run dev`
5. Open `http://localhost:5173`

Register two users in two browser windows to demonstrate real-time messaging.

## Deploy for free (Render + Neon)
The whole app runs as **one** free Render web service: Express serves the built React client, the REST API and the `/ws` WebSocket gateway from the same URL. The database is a free Neon Postgres.

1. Create a free project at [neon.tech](https://neon.tech) and copy the connection string (use the direct one, not the `-pooler` host). It looks like `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
2. On [render.com](https://render.com), choose **New → Blueprint** and select this repository. Render reads `render.yaml`.
3. When asked, paste the Neon string as `DATABASE_URL`. `JWT_SECRET` is generated automatically.
4. Deploy. Migrations run on start (`prisma migrate deploy`), and the app is live at `https://pulsechat-xxxx.onrender.com`.

On the free tier, the service sleeps after 15 minutes without traffic and takes about a minute to wake up.

## Portfolio features
- WebSocket room broadcasting
- JWT authentication
- Persistent messages
- Optimistic message UI
- Typing indicators
- Online/offline presence
- Read receipts
- Automatic WebSocket reconnect with exponential backoff
- REST API for rooms/history
- Password hashing and API rate limiting
- PostgreSQL via Prisma
- Dockerized database
- CI build/test workflow

## Architecture
React UI -> Redux Toolkit -> Redux-Saga -> WebSocket client -> Node WebSocket gateway -> PostgreSQL/Prisma

HTTP REST is used for authentication and message history; WebSockets are used for events that need low-latency delivery.

