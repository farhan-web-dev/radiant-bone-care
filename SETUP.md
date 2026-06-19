# Radiant Bone Care — Setup Guide

This guide covers **Phase 1: Supabase foundation**. Later phases will wire the booking UI, Stripe webhooks, admin dashboard, and email notifications.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local development)
- A Supabase project ([supabase.com/dashboard](https://supabase.com/dashboard))

---

## 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Note your **Project URL** and **anon public key** from **Project Settings → API**.

---

## 2. Apply Database Migrations

### Option A — Hosted project (SQL Editor)

1. Open **SQL Editor** in the Supabase Dashboard.
2. Copy the contents of `supabase/migrations/20250618120000_initial_schema.sql`.
3. Run the script.

### Option B — Supabase CLI (recommended)

```bash
# Install CLI: npm install -g supabase

# Link to your remote project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

### Option C — Local development

```bash
supabase start
supabase db reset   # applies migrations + seed.sql
```

Local credentials are printed after `supabase start`.

---

## 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_CLINIC_PAYMENT_LINK` | Stripe Payment Link for clinic appointments |
| `VITE_ONLINE_CONSULTATION_PAYMENT_LINK` | Stripe Payment Link for online consultations |
| `VITE_APP_URL` | Public site URL (e.g. `http://localhost:5173`) |

### Cloudflare Workers (production)

Add the same `VITE_*` variables in the Cloudflare dashboard or `.dev.vars` for local Wrangler dev:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CLINIC_PAYMENT_LINK=https://buy.stripe.com/...
VITE_ONLINE_CONSULTATION_PAYMENT_LINK=https://buy.stripe.com/...
VITE_APP_URL=https://your-domain.com
```

> **Note:** Server-only secrets (Stripe webhook secret, Resend API key, Supabase service role key) will be added in later phases via Supabase Edge Functions.

---

## 4. Create the Admin User

Admin access uses **Supabase Auth** plus the `admin_users` registry table.

### Step 1 — Create auth user

In Supabase Dashboard → **Authentication → Users → Add user**:

- Email: `admin@yourclinic.com`
- Password: strong password
- Copy the user's **UUID**

### Step 2 — Register as admin

Run in the SQL Editor (replace placeholders):

```sql
INSERT INTO public.admin_users (user_id, email)
VALUES ('PASTE_AUTH_USER_UUID_HERE', 'admin@yourclinic.com')
ON CONFLICT (user_id) DO NOTHING;
```

### Step 3 — Disable public signup

In **Authentication → Providers → Email**, disable **Enable sign ups** so only manually created users can log in.

The local `supabase/config.toml` already sets `enable_signup = false` for CLI-based dev.

---

## 5. Verify the Setup

Start the frontend:

```bash
npm run dev
```

In the browser console, confirm there is **no** Supabase configuration warning.

### Test RPC functions (SQL Editor)

```sql
-- Should return true for an open slot
SELECT public.is_slot_available('2026-06-20', '10:00');

-- Create a pay-at-clinic appointment
SELECT public.create_clinic_appointment(
  'Test Patient',
  'test@example.com',
  '03001234567',
  '2026-06-20',
  '10:00',
  'Test notes',
  'Orthopedic Consultation'
);

-- Same slot should now be unavailable
SELECT public.is_slot_available('2026-06-20', '10:00');
```

---

## Database Schema Overview

| Table | Purpose |
|-------|---------|
| `appointments` | Confirmed and pending clinic/online bookings |
| `payments` | Payment records linked to appointments |
| `patients` | Auto-created from appointment data |
| `pending_bookings` | Temporary storage before online consultation payment |
| `admin_users` | Links Supabase Auth users to admin role |

### Security

- **Row Level Security (RLS)** is enabled on all tables.
- **Public users** can only call secured RPC functions (`is_slot_available`, `create_clinic_appointment`, `create_pending_booking`).
- **Admins** (users in `admin_users`) get full CRUD via authenticated policies.
- **Double booking** is prevented by a partial unique index on `(appointment_date, appointment_time)` for non-cancelled appointments.

---

## Project Files Added (Phase 1)

```
supabase/
├── config.toml
├── seed.sql
└── migrations/
    └── 20250618120000_initial_schema.sql

src/lib/
├── supabase.ts          # Supabase client
├── database.types.ts    # TypeScript types
├── booking-api.ts       # Booking RPC helpers (used in Phase 2)
└── env.ts               # Payment link & URL helpers

src/vite-env.d.ts        # Vite env typings
.env.example             # Environment template
```

---

## Phase 2 — Booking system (implemented)

The booking form now uses Supabase RPC functions and Stripe Payment Links.

### Stripe Payment Link configuration

In Stripe Dashboard, set these URLs on each Payment Link:

| Link | Success URL | Cancel URL |
|------|-------------|------------|
| Clinic | `{VITE_APP_URL}/booking/success` | `{VITE_APP_URL}/booking/cancel` |
| Online consultation | `{VITE_APP_URL}/booking/success` | `{VITE_APP_URL}/booking/cancel` |

Update `.env`:

```
VITE_CLINIC_PAYMENT_LINK=https://buy.stripe.com/your-clinic-link
VITE_ONLINE_CONSULTATION_PAYMENT_LINK=https://buy.stripe.com/your-online-link
```

### Apply migrations to your project

**Option A — npm script** (add database password to `.env` first):

```
SUPABASE_DB_PASSWORD=your-db-password
npm run db:migrate
```

**Option B — SQL Editor:** run `supabase/combined_migration.sql` in the Supabase Dashboard SQL Editor.

---

## Phase 3 — Stripe webhooks (implemented)

Payments are confirmed server-side via a Supabase Edge Function when Stripe sends `checkout.session.completed`.

### Webhook endpoint

After deploying the function:

```
https://buhpebhatqsxfnuvcblb.supabase.co/functions/v1/stripe-webhook
```

### 1. Create Stripe webhook

In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks):

1. **Add endpoint** → paste the URL above
2. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
3. Copy the **Signing secret** (`whsec_…`)

### 2. Set Edge Function secrets

Add the signing secret to `supabase/.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
```

Then deploy (requires Supabase CLI login):

```bash
npx supabase login
npm run supabase:secrets
npm run supabase:deploy-webhook
```

### 3. How it works

| Step | Action |
|------|--------|
| User pays | Stripe Payment Link receives `client_reference_id` (appointment or pending booking UUID) |
| Stripe webhook | `stripe-webhook` function verifies signature and calls `process_stripe_payment` |
| Database | Appointment marked paid, or online consultation created from pending booking |
| Success page | Confirms booking if webhook hasn’t run yet (idempotent) |

### Database additions (Phase 3)

- `stripe_webhook_events` — idempotent webhook processing
- `process_stripe_payment()` — unified RPC (service role only)

---

## Phase 4 — Admin dashboard (implemented)

Secure admin panel at `/admin` with Supabase Auth + `admin_users` registry.

### Routes

| URL | Description |
|-----|-------------|
| `/admin/login` | Admin sign-in |
| `/admin` | Dashboard overview + charts |
| `/admin/appointments` | Search, filter, reschedule, cancel, complete |
| `/admin/patients` | Patient list + appointment/payment history |
| `/admin/payments` | Payment tracking + CSV export |

### Create your admin account

1. **Supabase Auth user** — Dashboard → Authentication → Users → Add user
2. **Register as admin** — SQL Editor:

```sql
INSERT INTO public.admin_users (user_id, email)
VALUES ('YOUR_AUTH_USER_UUID', 'admin@yourclinic.com')
ON CONFLICT (user_id) DO NOTHING;
```

3. Sign in at `http://localhost:5173/admin/login`

Or run the automated setup script (creates auth user + admin_users row):

```bash
npm run admin:ensure-user
```

Default test admin (created by script): `test1.email@test.com` / `test1234`

Non-admin accounts are rejected even if they exist in Supabase Auth.

### Features

- Dashboard stats: total, today, clinic, online, paid, pending
- Charts: appointments by day, booking type breakdown
- Appointment management with double-booking protection on reschedule
- Auto-generated patient records with expandable history
- Payment reports with CSV export and refund marking

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Console warning about missing Supabase env | Copy `.env.example` → `.env` and restart dev server |
| `This appointment slot is already booked` | Slot is taken; choose another date/time |
| Admin login works but dashboard denies access | Run `npm run admin:ensure-user` or insert the user's UUID into `admin_users` |
| Migration fails on `EXECUTE FUNCTION` | Requires PostgreSQL 14+ (Supabase uses PG 15) |
