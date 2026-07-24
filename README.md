# JUGAD — Real Backend Version

This is JUGAD with an actual server behind it: **Node.js + Express + MongoDB**, real authentication, a real shared database, real-time notifications via Server-Sent Events, and real email (SMTP) for password resets and "new software" alerts.

**The big difference from the earlier HTML/CSS/JS-only version:** that one stored everything in your browser's IndexedDB, so every visitor saw their own empty catalog. This version stores everything in one real MongoDB database, so **every visitor sees the same software, reviews, and listings you add as admin.** That's the whole point of this rebuild.

Same look, same logo, same theme — the frontend is the JUGAD site you already know. What changed is everything underneath it.

---

## Running it in VS Code

### 1. Install prerequisites
- **Node.js** (LTS) — [nodejs.org](https://nodejs.org)
- A MongoDB database — easiest is a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (takes ~5 minutes to set up: create account → free M0 cluster → create a database user → Network Access → allow `0.0.0.0/0` for now → Connect → Drivers → copy the connection string)

### 2. Open the project
Open the `jugad-backend` folder in VS Code (**File → Open Folder**).

### 3. Install dependencies
Open a terminal in VS Code (`` Ctrl+` ``):
```
npm install
```

### 4. Configure environment variables
```
copy .env.example .env      (Windows)
cp .env.example .env         (Mac/Linux)
```
Open `.env` and fill in:
- `MONGO_URI` — your MongoDB Atlas connection string (paste it in, replace `<password>` with your actual database user password)
- `JWT_SECRET` — any long random string (e.g. generate one at [randomkeygen.com](https://randomkeygen.com))
- `SMTP_*` — optional but recommended. For Gmail: enable 2FA on your Google account, generate an "App Password," and use that as `SMTP_PASS`. Without this, password reset still works — the code just shows on screen instead of being emailed.

### 5. Run it
```
npm run dev
```
You should see:
```
MongoDB connected: ...
JUGAD server running on port 5000
```
Open **http://localhost:5000** — that's the whole site, frontend and API, from one server.

### 6. First-time setup
Go to **http://localhost:5000/admin/setup.html** and create your real admin account. From here on, everything you add (software, developers, coupons) is stored in MongoDB and visible to every visitor — including your friends, if they hit the same URL.

---

## Letting your friends actually use it together

Now that there's a real shared database, this finally does what you originally wanted. Two ways to get there:

**A. Same WiFi (quick test):** find your local IP (`ipconfig` on Windows, `ipconfig getifaddr en0` on Mac), run the server, share `http://YOUR_IP:5000` with anyone on the same network.

**B. Actually online (recommended for real use):** deploy the server somewhere it stays running:
1. Push this folder to a GitHub repo
2. Deploy on [Render](https://render.com) or [Railway](https://railway.app) (both have free tiers) — connect your repo, set the same environment variables from your `.env` in their dashboard, deploy
3. Your friends get a real URL like `https://jugad.onrender.com` that works for everyone, all the time, without your computer needing to stay on

MongoDB Atlas's free tier is already a real cloud database, so no separate database hosting step is needed.

---

## What's real now (vs. the browser-only version)

| Feature | Before (IndexedDB) | Now (this version) |
|---|---|---|
| Software catalog | Per-browser, not shared | Shared — one MongoDB database, everyone sees the same thing |
| Login / accounts | Client-side only | Real JWT auth, bcrypt-hashed passwords, server-verified |
| Payment confirmation gate | Per-browser | Real — admin confirms in Orders, unlocks for that specific user for real |
| Notifications | Same-browser tabs only (BroadcastChannel) | Real-time across every visitor's device (Server-Sent Events) |
| Password reset email | Required EmailJS (client-side) | Real SMTP email sent from the server |
| File uploads (cover images, installers, QR, developer photos) | Base64 in browser storage | Real files on the server's disk |

## What's still not "enterprise production" (be aware)

- **File storage**: installer/cover files live on the server's local disk. This is fine for a small friends-and-family deployment, but on most free hosts (Render, Railway) the disk doesn't persist across redeploys. For anything long-term, move to S3/Cloudflare R2 — the `uploads/` folder structure is already isolated in `middleware/upload.js` if you want to swap it later.
- **Payments**: still manual UPI (you scan-to-pay, admin confirms) rather than an automated Razorpay/Stripe integration — this was intentional per your earlier requests, but worth knowing it's not auto-verified against your bank.
- **Backups**: set up MongoDB Atlas automatic backups before this holds anything you'd be upset to lose.

---

## Project structure

```
jugad-backend/
  server.js              Express app — API routes + serves the frontend
  config/db.js             MongoDB connection
  models/                    User, Software, Order, Review, Coupon, Developer, Notification, Subscriber, Settings, ActivityLog
  middleware/                 auth (JWT), upload (multer), error handling, validation
  controllers/                  Business logic per resource
  routes/                        API route definitions
  utils/                          Token generation, slugify, real SMTP mailer, SSE hub
  uploads/                          Uploaded files (covers, software installers, QR codes, developer photos)
  public/                            The JUGAD frontend — same HTML/CSS you had, JS now calls the real API
    js/api.js                        NEW — fetch wrapper for all backend calls
    js/auth.js                        Rewritten — real login/register/session via the API
    js/notifications.js                Rewritten — real-time via Server-Sent Events
  .env.example
  package.json
```

## API overview (if you want to poke at it directly)

Base URL: `http://localhost:5000/api`

- `POST /auth/setup`, `/auth/login`, `/auth/register`, `GET /auth/me`
- `GET /software`, `/software/featured`, `/software/upcoming`, `/software/:slug`
- `POST /orders/create`, `GET /orders/my`
- `GET /developers`, `GET /settings`
- `GET /notifications/stream` — Server-Sent Events, real-time push
- `POST /admin/software`, `/admin/orders/:id/confirm`, etc. — all require an admin JWT

Try `curl http://localhost:5000/api/health` once the server's running to confirm it's alive.
