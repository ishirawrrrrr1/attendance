# RFID Attendance Repository

This repository now centers on the `web/` app, which is the active attendance system built with Next.js and Supabase and intended for Vercel deployment.

## Active app

- Web app: `web/`
- Database: Supabase Postgres
- Storage: Supabase Storage
- Device endpoint: `/rfid_system/insert?uid={RFID_UID}&pin={USER_PIN}`

## Repository layout

- `web/`: active Next.js + Supabase application
- `main.ino`: ESP32 RFID + keypad sketch for the device
- `web/database/supabase-schema.sql`: schema and seed data for Supabase
- `database/`, `assets/`, `admin/`, `auth/`: legacy PHP/MySQL files kept only as old reference material

## Deployment direction

- Production web hosting target: Vercel
- Production database target: Supabase
- The active web app no longer uses the old PHP `insert.php` endpoint

## Device request format

```text
https://<your-vercel-domain>/rfid_system/insert?uid={RFID_UID}&pin={USER_PIN}
```

The route returns plain text:

- `SUCCESS`
- `DENIED`

## Setup

1. Go to `web/`.
2. Install dependencies with `npm install`.
3. Run `web/database/supabase-schema.sql` in the Supabase SQL Editor.
4. Copy `web/.env.example` to `.env.local` inside `web/` and fill in the required values.
5. Start the app with `npm run dev`.

## GitHub and Vercel

- Push the repository source code to GitHub, but do not commit `web/.env.local` or any secret keys.
- In Vercel, set `Root Directory` to `web`.
- In Vercel Project Settings, add the same values from your local `web/.env.local` for:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SESSION_SECRET`
- This keeps the deployed site connected to the same existing Supabase project without exposing secrets in GitHub.

## Notes

- Web login uses username or email plus password.
- RFID scans use UID plus PIN.
- Attendance rules are stored in Supabase `app_settings`, not in local PHP config files.
