# Money Manager PWA

A full-featured personal finance web app with cloud sync, inspired by the [Money manager & expenses](https://play.google.com/store/apps/details?id=ru.innim.my_finance) Android app — with a distinct bold dark dashboard UI.

## Features

- **Auth:** Email/password + Google OAuth (Better Auth)
- **Accounts:** Multiple wallets/cards with colors, hidden accounts, starting balance, notes
- **Transactions:** Expense, income, transfer — quick-add, search, sort, duplicate, calculator
- **Categories:** Built-in templates + custom, monthly budget limits
- **Dashboard:** KPI cards, cash-flow chart, category bars, account & period filters
- **Charts & reports:** Spending analytics, budget progress
- **Multi-currency:** Per-account currency, exchange rate caching (Frankfurter API)
- **Recurring payments:** Auto-create, upcoming view, search, Web Push reminders
- **PWA:** Installable, service worker, offline cache (IndexedDB)
- **Security:** Optional PIN app lock
- **Export:** Excel, PDF, JSON backup/restore
- **Tags, settings, i18n scaffold**

## Tech Stack

Next.js 16 · PostgreSQL · Prisma 7 · Better Auth · Tailwind · Recharts · Serwist PWA

## Setup (no Docker)

### 1. Install dependencies

```bash
npm install
```

### 2. Start a local PostgreSQL database

**Option A — Prisma Dev (recommended, no Docker):**

```bash
npm run db:dev
```

Copy the `DATABASE_URL` printed in the terminal into your `.env` file.

**Option B — Existing PostgreSQL:**

Point `DATABASE_URL` in `.env` at any PostgreSQL instance (local install, Neon, Supabase, etc.).

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (32+ random characters)
- `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)

Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `UPLOADTHING_TOKEN`, VAPID keys for push.

### 4. Apply schema

```bash
npm run db:push
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register, and start tracking.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (webpack) |
| `npm run build` | Production build |
| `npm run db:dev` | Start local Postgres via Prisma Dev |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create/run migrations |
| `npm run db:studio` | Open Prisma Studio |

## Deploy

Deploy to Vercel with a hosted PostgreSQL (Neon, Supabase, Prisma Postgres). Set all env vars from `.env.example`.
