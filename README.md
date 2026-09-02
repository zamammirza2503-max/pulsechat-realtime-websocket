# PulseChat — Real-Time Chat Portfolio Project

Original TypeScript rebuild inspired by the architecture and learning goals of the freeCodeCamp article by Flavio Copes. It keeps React + Redux + Redux-Saga + WebSockets, then extends the project with authentication, PostgreSQL persistence, rooms, optimistic UI, typing indicators, presence, read receipts, reconnect logic, validation, Docker and CI.

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

## Attribution
Learning reference: freeCodeCamp, “How to Build a Chat Application using React, Redux, Redux-Saga, and Web Sockets”, Flavio Copes.
https://www.freecodecamp.org/news/how-to-build-a-chat-application-using-react-redux-redux-saga-and-web-sockets-47423e4bc21a

This repository is an original modernization/extension, not a copy of the tutorial source.
