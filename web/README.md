# Next.js + Supabase RFID Attendance

This folder contains the active attendance system for deployment on Vercel.

## Stack

- Next.js App Router
- Supabase Postgres
- Supabase Storage
- Server-side Supabase access through `@supabase/supabase-js`
- Vercel-ready RFID route at `/rfid_system/insert`

## Required environment variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

## Local setup

1. Install dependencies:
   `npm install`
2. Run the SQL in `database/supabase-schema.sql` in the Supabase SQL Editor.
3. Create `.env.local` from `.env.example`.
4. Start the app:
   `npm run dev`

## Production on Vercel

Set the same environment variables in the Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`

## RFID endpoint

ESP32 request format:

`/rfid_system/insert?uid={RFID_UID}&pin={USER_PIN}`

Response:

- `SUCCESS`
- `DENIED`

## ESP32 connection examples

For Vercel:

`https://your-project.vercel.app/rfid_system/insert?uid=ADMIN001&pin=1234`

For local network testing:

`http://192.168.0.7:3001/rfid_system/insert?uid=ADMIN001&pin=1234`

Update `main.ino`:

`const char* serverBaseUrl = "https://your-project.vercel.app";`

If you test against your laptop on the same Wi-Fi, replace that value with your local machine IP and port.

## Notes

- Admin web login uses `username/email + password`
- Device scans use `RFID UID + PIN`
- The active app uses Supabase for users, attendance records, settings, and avatar storage
