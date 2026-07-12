# Project Decisions

- Use Next.js with TypeScript.
- Use Supabase for authentication and database.
- Use TMDB for TV and movie metadata.
- Each family member has a separate account.
- Support Google login and email magic-link login.
- Prefer Google as the primary sign-in option; keep email magic-link as a secondary fallback.
- Google OAuth client secrets stay in the Supabase dashboard only; the app never stores or exposes them.
- Shared `media_items` metadata is readable by authenticated users but writable only via a server-only Supabase admin client using `SUPABASE_SECRET_KEY`; never expose that secret to the browser.
- Movie watch state uses `watched_at`: `NULL` means Watch Next (unwatched), non-`NULL` means Watched. Do not add a separate movie status column. Keep `is_favourite` as its own boolean.
- User-owned library tables reference `auth.users(id)` with `ON DELETE CASCADE`; do not add a second foreign key to `profiles`.
- Exclude Season 0 and specials from progress by default.
- Preserve original watched dates during TV Time import.
- Show all announced upcoming episodes.
- Group same-day season releases.
- Support light, dark and system themes.