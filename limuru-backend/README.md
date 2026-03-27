# Limuru Dairy Company — Backend API

Node.js + Express + PostgreSQL backend covering everything the front-end page needs:
appointments, careers & job applications, chat/support messages, the newsletter,
a product catalog, orders (basic e-commerce), stockists, and an admin login for
managing all of it.

## 1. Requirements

- Node.js 18+
- PostgreSQL 14+ (local install, or a free instance from Supabase/Neon/Railway)

## 2. Setup

```bash
cd limuru-backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `DATABASE_URL` — your Postgres connection string
- `JWT_SECRET` — any long random string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for your first admin login
- SMTP settings are optional; leave blank to skip email notifications

Create the tables, then seed an admin account and a few sample products:

```bash
npm run migrate
node db/seed.js
```

Start the server:

```bash
npm start        # production
npm run dev       # auto-restart on changes (requires nodemon, already in devDependencies)
```

The API runs at `http://localhost:4000` by default.

## 3. Connecting the front-end

Point your existing forms at these endpoints instead of the placeholder `mailto:` /
`alert()` handlers:

- Newsletter form → `POST /api/newsletter` with `{ email }`
- "Book an Appointment" → `POST /api/appointments`
- "Chat With Us" → `POST /api/chat`
- Job application form (on a careers page) → `POST /api/applications` (multipart form, field name `resume` for the file)

Example fetch from the newsletter form already on the page:

```js
document.querySelector('.foot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.querySelector('input').value;
  const res = await fetch('http://localhost:4000/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  alert(data.message || data.error);
  e.target.reset();
});
```

## 4. Admin access

```
POST /api/auth/login
{ "email": "...", "password": "..." }
```
Returns a JWT. Send it as `Authorization: Bearer <token>` on any admin route
(anything with GET lists of full data, PATCH/DELETE, POST /api/careers, etc.)

There's no built-in admin UI here — pair this API with a tool like
[Retool](https://retool.com) or [Refine](https://refine.dev), or a small custom
React dashboard, to click through appointments/applications/orders/messages.
I can build that dashboard next if useful.

## 5. Endpoint reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | — | Admin login |
| POST | /api/appointments | public | Submit booking request |
| GET | /api/appointments | admin | List bookings |
| PATCH | /api/appointments/:id | admin | Confirm/decline/complete |
| GET | /api/careers | public | List open roles |
| POST/PATCH/DELETE | /api/careers | admin | Manage job postings |
| POST | /api/applications | public | Apply to a job (+ resume upload) |
| GET/PATCH | /api/applications | admin | Review applications |
| POST | /api/chat | public | Send a message |
| GET/PATCH | /api/chat | admin | View & reply to messages |
| POST | /api/newsletter | public | Subscribe |
| POST | /api/newsletter/unsubscribe | public | Unsubscribe |
| GET | /api/newsletter | admin | Export subscribers |
| GET | /api/products | public | List products |
| POST/PATCH/DELETE | /api/products | admin | Manage catalog |
| POST | /api/orders | public | Place an order |
| GET/PATCH | /api/orders | admin | Manage orders |
| GET | /api/stockists | public | List stockists |
| POST/DELETE | /api/stockists | admin | Manage stockists |
| GET | /api/dashboard | admin | Summary counts for an admin homepage |

## 6. Security notes before going live

- Put this behind HTTPS (e.g. deploy on Render/Railway/Fly.io with their managed TLS)
- Rotate `JWT_SECRET` and never commit `.env`
- The rate limiter on public write routes is intentionally loose (30 req / 15 min) — tighten if you see abuse
- Resumes are stored on local disk in `/uploads`; move to S3 or similar if you deploy on ephemeral hosting
