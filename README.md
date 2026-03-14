# PDFcheck — Online PDF Tools

> Free, fast, and secure PDF tools for everyone.
> **Live:** https://pdf-tool-website-review.vercel.app
> **Repo:** https://github.com/aouirdani/pdfcheck

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Tailwind CSS 4 + Vite 7 |
| PDF Processing | pdf-lib (client-side), PDF.js |
| Format Conversion | CloudConvert API |
| OCR | OCR.space API |
| Backend | Supabase (Auth, Storage, Realtime, Edge Functions) |
| Database | PostgreSQL with Row Level Security |
| Edge Runtime | Deno (Supabase Edge Functions) |
| Payments | Stripe Checkout + Webhooks |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## Features

- **22 PDF tools** — merge, split, compress, rotate, reorder, add pages, watermark, sign, annotate, protect, unlock, page numbers, JPG↔PDF, Word↔PDF, Excel↔PDF, PowerPoint↔PDF, HTML→PDF, OCR
- **Client-side processing** — files never leave the browser for core tools
- **Auth** — email/password + Google OAuth (Supabase Auth)
- **Job history** — every tool run saved to `jobs` table with status tracking
- **Realtime progress** — Supabase Realtime subscriptions on job updates
- **Stripe payments** — Premium ($7/mo) and Team ($14/user/mo) plans
- **RLS** — Row Level Security on all tables

---

## Project Structure

```
├── src/
│   ├── components/        # React components
│   │   ├── Header.tsx     # Nav, search, auth button
│   │   ├── Hero.tsx       # Landing hero
│   │   ├── ToolCard.tsx   # Tool grid card
│   │   ├── ToolModal.tsx  # File upload + processing modal
│   │   ├── AuthModal.tsx  # Login / register modal
│   │   ├── Pricing.tsx    # Stripe checkout integration
│   │   ├── Features.tsx   # Features section
│   │   └── Footer.tsx     # Footer
│   ├── contexts/
│   │   └── AuthContext.tsx  # Supabase Auth state
│   ├── data/
│   │   └── tools.ts       # Tool definitions (id, title, icon, category)
│   ├── lib/
│   │   ├── supabase.ts    # Supabase client
│   │   ├── pdf-engine.ts  # Client-side PDF processing (pdf-lib)
│   │   ├── tool-processor.ts  # Routes tool calls to correct engine
│   │   ├── cloudconvert.ts    # CloudConvert API client
│   │   ├── ocr.ts         # OCR.space API client
│   │   ├── storage.ts     # Supabase Storage helpers
│   │   ├── jobs.ts        # Job CRUD + Realtime
│   │   └── database.types.ts  # TypeScript types
│   └── types/
│       └── database.ts    # Supabase auto-generated types
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Tables, RLS, triggers, enums
│   │   ├── 002_auto_confirm_emails.sql
│   │   └── 003_schedule_anon_cleanup.sql
│   └── functions/
│       ├── create-checkout/   # Stripe Checkout Session creator
│       ├── stripe-webhook/    # Stripe webhook handler
│       └── tools/             # Per-tool edge functions (CloudConvert proxy)
├── mcp-servers/
│   └── google-cloud/      # MCP server for Google Cloud Console
└── .mcp.json              # MCP server configuration
```

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

### Frontend (`.env.local` + Vercel)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Payments | Stripe publishable key (`pk_live_...`) |
| `VITE_CLOUDCONVERT_API_KEY` | Conversions | CloudConvert API key (25 free/day) |
| `VITE_OCR_SPACE_API_KEY` | OCR | OCR.space key (optional, free tier works) |

### Edge Functions (Supabase Dashboard → Edge Functions → Secrets)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (Project Settings → API) |
| `STRIPE_SECRET_KEY` | Payments | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Payments | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_PREMIUM` | Payments | Stripe Price ID for Premium plan |
| `STRIPE_PRICE_TEAM` | Payments | Stripe Price ID for Team plan |
| `CLOUDCONVERT_API_KEY` | Conversions | CloudConvert API key (server-side) |

---

## Database Schema

```sql
-- Enums
job_status: pending | processing | done | error
job_tool:   merge | split | compress | rotate | ... (22 tools)

-- Tables
profiles (id, email, full_name, plan, jobs_this_month, stripe_customer_id, ...)
jobs     (id, user_id, tool, status, progress, input_paths, output_path, ...)

-- RLS
profiles: users can select/update own row
jobs:     users can select/insert/update/delete own jobs; anon jobs allowed
storage:  authenticated users upload to /{uid}/; anon users upload to /anon/
```

---

## Supabase Edge Functions

| Function | Method | Auth | Description |
|---|---|---|---|
| `create-checkout` | POST | Bearer token | Creates Stripe Checkout Session, returns redirect URL |
| `stripe-webhook` | POST | Stripe signature | Handles `checkout.session.completed` → sets plan to premium; `customer.subscription.deleted` → reverts to free |

### Deploy edge functions

```bash
# Via Supabase MCP (already deployed)
# Or via CLI:
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook
```

---

## Google OAuth Setup

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → **Create OAuth 2.0 Client ID**
2. Application type: **Web application**
3. Authorized redirect URI:
   ```
   https://yotqoouitaonibdtfztx.supabase.co/auth/v1/callback
   ```
4. Copy Client ID + Secret
5. Supabase Dashboard → Authentication → Providers → **Google** → Enable → paste credentials
6. Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `https://pdf-tool-website-review.vercel.app`
   - Redirect URLs: `https://pdf-tool-website-review.vercel.app`, `http://localhost:5173`

---

## Stripe Setup

1. [dashboard.stripe.com](https://dashboard.stripe.com) → Products → create **Premium** ($7/mo) and **Team** ($14/mo)
2. Copy each product's Price ID (`price_...`)
3. Add to Supabase Edge Function secrets (see env vars above)
4. Webhooks → Add endpoint: `https://yotqoouitaonibdtfztx.supabase.co/functions/v1/stripe-webhook`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
5. Copy webhook signing secret → add as `STRIPE_WEBHOOK_SECRET`

---

## MCP Servers

### Supabase (built-in)
Configured in `.mcp.json`. Used to manage the Supabase project directly from Claude Code.

### Google Cloud (`mcp-servers/google-cloud/`)

MCP server to manage Google Cloud resources programmatically.

**Tools:** `list_projects` · `enable_api` · `list_enabled_apis` · `list_service_accounts` · `create_service_account` · `create_service_account_key` · `list_iam_policy` · `add_iam_binding` · `list_oauth_clients` · `create_oauth_client` · `get_oauth_setup_url`

**Setup:**
```bash
# Option A — Application Default Credentials (easiest)
gcloud auth application-default login

# Option B — Service account key
# Download JSON key from Google Cloud Console → IAM → Service Accounts
# Paste entire JSON as GOOGLE_SERVICE_ACCOUNT_KEY in .mcp.json env
```

---

## Deployment

### Frontend (Vercel)

```bash
npx vercel --prod --yes
```

Vercel auto-deploys on every push to `main` via GitHub integration.

### Edge Functions (Supabase)

Already deployed. Redeploy via:
```bash
supabase functions deploy create-checkout --project-ref yotqoouitaonibdtfztx
supabase functions deploy stripe-webhook  --project-ref yotqoouitaonibdtfztx
```

---

## What's Working

| Feature | Status |
|---|---|
| All 22 tool cards | ✅ |
| PDF processing (merge, split, compress, rotate, etc.) | ✅ Client-side |
| File download after processing | ✅ |
| Job saved to DB after each tool run | ✅ |
| Email/password auth | ✅ |
| Session persistence across page refresh | ✅ |
| Google OAuth | ⚙️ Needs Google Cloud credentials |
| Stripe checkout | ⚙️ Needs Stripe keys in Supabase secrets |
| CloudConvert tools (Word, Excel, PPT conversions) | ⚙️ Needs API key |
| Storage upload | ✅ Bucket + RLS configured |
| Realtime job tracking | ✅ |
| RLS on all tables | ✅ |
| Anonymous job cleanup (cron) | ✅ Hourly |
