# Personal TV and Movie Tracker

Next.js app for private TV and movie tracking, backed by Supabase Auth and Postgres.

## Authentication

Supported sign-in methods:

- **Continue with Google** (primary)
- **Email magic link** (secondary fallback)

Both flows return through `/auth/callback` and land on `/shows` when successful.

Google OAuth credentials are configured in the hosted Supabase project. This app only needs the public Supabase URL and publishable key — never a Google client secret or Supabase service-role key.

### Supabase Auth URL settings

Keep the **Site URL** as production:

- Site URL: `https://tracktv.vercel.app`

Add these under **Redirect URLs** (exact match required — no query strings):

```text
http://localhost:3000/auth/callback
https://tracktv.vercel.app/auth/callback
```

Optional wildcards for local/preview flexibility:

```text
http://localhost:3000/**
https://*-*.vercel.app/**
```

Important: the app’s `redirectTo` must match an allowlist entry exactly. Appending `?next=…` causes Supabase to reject the URL and fall back to the Site URL (so a localhost Google sign-in can land on production). Post-login destination is stored in a short-lived cookie instead.

Existing users who later sign in with Google using the same verified email should resolve to the same Supabase user/profile through Supabase identity linking.

## Getting Started

```bash
npm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Docs

See `docs/PRODUCT_REQUIREMENTS.md`, `docs/BUILD_PLAN.md`, `docs/DECISIONS.md`, and `docs/TASKS.md`.
