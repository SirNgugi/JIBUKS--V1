# JIBUKS Backend

Node.js + Express backend for the JIBUKS mobile app.

Features:
- Express server with JSON API
- PostgreSQL via `pg`
- Basic users table and endpoints: `GET /users`, `POST /users`
- DB init script that runs `db/init.sql`

Getting started
1. Copy `.env.example` to `.env` and set `DATABASE_URL` and `PORT`.
2. Install dependencies: `npm install` (run in `backend/`)
3. Initialize the database: `npm run db:init` (this runs `scripts/initDb.js`)
4. Start server: `npm run dev` for development or `npm start` for production.

Example `DATABASE_URL`:
postgres://postgres:postgres@localhost:5432/jibuks_dev

API
- GET /users - list users
- POST /users - create user with JSON body { name, email, password }

From React Native, point your requests to `http://<SERVER_HOST>:<PORT>`.
