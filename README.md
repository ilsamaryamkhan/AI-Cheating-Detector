# AI Human Presence Detection System
### atomcamp Arabia — AI Proctoring Platform

A full-stack AI proctoring system that detects whether a real human is actively taking an online exam. Built for EdTech and training providers in KSA.

---

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Socket.io-client
- **Backend:** Fastify, Node.js, TypeScript, Socket.io
- **Database:** PostgreSQL, Prisma ORM
- **Detection:** MediaPipe (in-browser face detection)
- **Auth:** JWT tokens

---

## Prerequisites

Make sure you have these installed:

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL running on port 5432
- Git

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/ilsamaryamkhan/AI-Cheating-Detector.git
cd AI-Cheating-Detector
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Set up environment variables

Create `apps/api/.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
COOKIE_SECRET=your-cookie-secret-change-in-production
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cheating_detector"
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Set up the database

Create the database in PostgreSQL:

```bash
psql -U postgres -c "CREATE DATABASE cheating_detector;"
```

Run migrations:

```bash
cd apps/api
pnpm prisma migrate deploy
```

Seed with initial data:

```bash
pnpm seed
```

### 5. Start the application

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
pnpm dev
```

---

## Default Accounts

After seeding, these accounts are ready to use:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@atomcamp.com | password123 |
| Proctor | proctor@atomcamp.com | password123 |
| Candidate | Register at /register | - |

---

## Application URLs

| Page | URL |
|------|-----|
| Login | http://localhost:3000/login |
| Register | http://localhost:3000/register |
| Candidate Exam | http://localhost:3000/exam |
| Proctor Dashboard | http://localhost:3000/proctor |
| Admin Dashboard | http://localhost:3000/admin |
| API Health | http://localhost:4000/health |

---

## Features

- Real-time face detection using MediaPipe (runs entirely in-browser)
- Face absence detection — flagged after 5 consecutive seconds
- Multiple face detection
- Tab switch and window focus loss detection
- Paste detection — large pastes flagged as high severity
- Live proctor dashboard with WebSocket updates
- Role-based access control
- Session reports with risk scores and event audit trail

---

## Deployment

- **Frontend:** Vercel
- **Backend + Database:** Railway

See deployment guide for production environment variable configuration.

---

## License

Internal project — atomcamp Arabia. Not for public distribution.