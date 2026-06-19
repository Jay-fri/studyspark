# StudyLM — AI-Powered Study Assistant

> Upload your lecture notes and slides, then chat, quiz yourself, generate flashcards, build mind maps, and study with an AI tutor — all without leaving the browser.

![StudyLM Screenshot](public/logo.jpg)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript (strict) |
| Build tool | Vite 6 with PWA plugin |
| Styling | Tailwind CSS 3 + shadcn/ui (new-york) |
| Animation | Framer Motion |
| Routing | React Router v7 (lazy pages) |
| State | Zustand with persist |
| Data fetching | TanStack React Query |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| AI | Groq — LLaMA 3.3 70B & LLaMA 3.1 8B |
| Payments | Flutterwave |
| Hosting | Cloudflare Pages |

---

## Local Development

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Supabase CLI (`brew install supabase/tap/supabase`)

### 1. Clone & install

```bash
git clone https://github.com/your-org/studylm.git
cd studylm
# If npm cache is root-owned:
sudo chown -R $(whoami) ~/.npm
npm install
```

### 2. Set up environment variables

Copy and fill in `.env.local`:

```bash
cp .env.local.example .env.local
```

See **Environment Variables** below for all required values.

### 3. Start Supabase locally (optional)

```bash
supabase start
supabase db push         # applies all migrations
supabase functions serve  # serves Edge Functions locally
```

### 4. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:5173`.

### Useful commands

```bash
npm run build      # production build → dist/
npm run preview    # preview production build locally
npm run lint       # ESLint
npx tsc --noEmit   # TypeScript check
```

---

## Environment Variables

Create `.env.local` in the project root:

```bash
# Supabase project credentials (Settings → API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Groq API key — local dev only.
# In production: set as an Edge Function secret, NOT a Cloudflare env var.
VITE_GROQ_API_KEY=gsk_...

# Flutterwave public key (safe to expose — only initialises the payment widget)
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-...

# App base URL (used for OAuth redirects)
VITE_APP_URL=http://localhost:5173
```

### Edge Function secrets (Supabase CLI)

```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
supabase secrets set R2_ACCOUNT_ID=your-cloudflare-account-id
supabase secrets set R2_BUCKET_NAME=studylm-documents
supabase secrets set R2_ACCESS_KEY_ID=your-r2-access-key-id
supabase secrets set R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
```

> **Security:** `GROQ_API_KEY` and R2 credentials must **never** appear in the frontend bundle or Cloudflare environment variables. All document storage uses private R2 buckets with signed URLs generated server-side.

---

## Deployment

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Push migrations:
   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```
3. Deploy Edge Functions:
   ```bash
   supabase functions deploy proxy-groq
   supabase functions deploy verify-payment
   supabase functions deploy fetch-url
   supabase functions deploy generate-upload-url
   supabase functions deploy get-document-url
   supabase functions deploy process-source
   ```
4. Set Edge Function secrets:
   ```bash
   supabase secrets set GROQ_API_KEY=gsk_...
   supabase secrets set FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
   supabase secrets set R2_ACCOUNT_ID=your-cloudflare-account-id
   supabase secrets set R2_BUCKET_NAME=studylm-documents
   supabase secrets set R2_ACCESS_KEY_ID=your-r2-access-key-id
   supabase secrets set R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
   ```
5. Supabase dashboard → Storage → create an `avatars` bucket set to **Public**.

### Cloudflare Pages

1. Push your repo to GitHub.
2. Cloudflare Pages dashboard → **Create application** → **Connect to Git** → select repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `18`
4. Add environment variables (Settings → Environment variables):
   ```
   VITE_SUPABASE_URL           = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY      = eyJhbGci...
   VITE_FLUTTERWAVE_PUBLIC_KEY = FLWPUBK_TEST-...
   VITE_APP_URL                = https://your-app.pages.dev
   ```
   > Do **not** add `VITE_GROQ_API_KEY` here — use Supabase Edge Function secrets only.
5. Enable **Deploy on push to main**.
6. `public/_redirects` already contains `/* /index.html 200` for SPA routing.

---

## Database Schema

### Core tables

| Table | Purpose |
|---|---|
| `profiles` | User profile, token balance (`study_tokens`), role |
| `notebooks` | User's study notebooks |
| `sources` | Files / URLs attached to a notebook |
| `ai_outputs` | Cached AI-generated content per notebook |
| `chat_history` | Per-notebook chat messages |
| `token_transactions` | Full audit log of every token credit & debit |
| `payments` | Flutterwave payment records |
| `announcements` | Admin-published announcements |
| `announcement_reads` | Per-user read receipts |
| `groq_rate_limits` | Per-minute request counters (auto-pruned) |

### Row Level Security

RLS is enabled on every table. Key policies:

- Users can only read/write their own rows.
- `is_admin()` (SECURITY DEFINER) gates all admin-level policies — no recursion.
- `verify-payment` and `proxy-groq` Edge Functions use the **service role key** for privileged writes — never exposed to the client.

---

## Token System

### Costs per action

| Action | Tokens |
|---|---|
| Chat message | 5 |
| Key concepts | 15 |
| Summary | 20 |
| Flashcards | 20 |
| Quiz | 25 |
| Mind map | 30 |
| Study guide | 35 |
| Podcast script | 40 |

### Purchase packages

| Package | Tokens | Price (₦) |
|---|---|---|
| Starter | 500 | 1,000 |
| Study Pro | 2,500 | 4,000 |
| Scholar | 7,500 | 10,000 |

New accounts receive **1,000 free tokens** via a database trigger on `auth.users`.

Token crediting is **idempotent**: `credit_tokens()` checks `flutterwave_ref` before inserting, preventing duplicate payment callbacks from double-crediting an account.

---

## Edge Functions

| Function | Purpose |
|---|---|
| `proxy-groq` | Validates JWT, enforces 10 req/min rate limit, strips prompt injection from user input, proxies to Groq API. Supports streaming SSE. Keeps API key server-side. |
| `verify-payment` | Verifies Flutterwave transaction amount server-side, credits tokens idempotently, records the payment. |
| `fetch-url` | Fetches a web page on behalf of the client (bypasses CORS). Used when adding a URL as a notebook source. Blocks private/localhost addresses. |
| `generate-upload-url` | Generates presigned R2 PUT URLs for direct file uploads. Validates JWT and creates unique file keys per user. |
| `get-document-url` | Generates presigned R2 GET URLs for secure document viewing. Validates ownership via RLS before returning signed URL (1hr expiry). |
| `process-source` | Chunks uploaded document text into digestible pieces for AI processing. Stores chunks in `source_chunks` table. |

All functions share `supabase/functions/_shared/cors.ts` for consistent CORS headers.

---

## Security Notes

- **API keys:** Only the Supabase anon key and Flutterwave public key appear in the browser bundle. All secret keys live in Edge Function secrets.
- **Document storage:** All uploaded documents are stored in private Cloudflare R2 buckets. Access is granted via temporary signed URLs (1hr expiry) generated server-side after ownership verification.
- **RLS:** Every table has Row Level Security — a leaked anon key cannot read other users' data.
- **Prompt injection:** `proxy-groq` strips known injection patterns from user messages before forwarding to Groq.
- **Rate limiting:** `proxy-groq` enforces 10 requests/minute per authenticated user via a server-side atomic counter.
- **Payment validation:** All payment amounts are verified server-side against Flutterwave — the client never self-reports the amount credited.
- **SSRF protection:** `fetch-url` blocks private/localhost addresses and only permits `http`/`https`.

---

## Production Checklist

- [ ] User signs up → profile created → 1,000 tokens granted
- [ ] User uploads PDF → text extracted → saved to Supabase
- [ ] User sends chat message → Groq responds streaming → 5 tokens deducted
- [ ] User generates quiz → JSON parsed → quiz UI renders → 25 tokens deducted
- [ ] User generates flashcards → flip animation works → SRS tracking works
- [ ] User saves output to Library → shows in Library page
- [ ] Tokens hit 0 → payment modal opens → Flutterwave flow → tokens credited
- [ ] Admin can view all users and grant tokens
- [ ] PWA installs on mobile → offline page works
- [ ] Dark mode persists across reloads
- [ ] All pages responsive on mobile
- [ ] ⌘K command palette works across notebooks
- [ ] All Supabase RLS policies block unauthorised access

---

## Contributing

1. Fork and create a feature branch: `git checkout -b feat/my-feature`
2. TypeScript strict mode must pass: `npx tsc --noEmit`
3. Test the feature end-to-end in a browser
4. Open a PR against `main` with a clear description

### Code conventions

- `import toast from "react-hot-toast"` — never `sonner` (not installed)
- Supabase mutations use `as any` casts — the project uses an untyped client intentionally
- No comments unless the _why_ is non-obvious

---

## License

MIT © StudyLM

niceee
