# Project Decisions

- Use Next.js with TypeScript.
- Use Supabase for authentication and database.
- Use TMDB for TV and movie metadata.
- Each family member has a separate account.
- Support Google login and email magic-link login.
- Prefer Google as the primary sign-in option; keep email magic-link as a secondary fallback.
- Google OAuth client secrets stay in the Supabase dashboard only; the app never stores or exposes them.
- Exclude Season 0 and specials from progress by default.
- Preserve original watched dates during TV Time import.
- Show all announced upcoming episodes.
- Group same-day season releases.
- Support light, dark and system themes.