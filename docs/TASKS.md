# Personal TV and Movie Tracker — Task Checklist

Update this checklist as work is completed.

Do not mark a phase complete until all acceptance criteria have been manually verified.

## Phase 0 — Project setup

* [x] Create Next.js project
* [x] Enable TypeScript
* [x] Enable Tailwind CSS
* [x] Install `@supabase/supabase-js`
* [x] Install `@supabase/ssr`
* [x] Initialize Git repository
* [x] Create GitHub repository
* [x] Push base project to GitHub
* [x] Create Supabase hosted project
* [x] Add Supabase values to `.env.local`
* [x] Create `.env.example`
* [x] Confirm `.env.local` is ignored
* [x] Install Supabase CLI
* [x] Run `npx supabase init`
* [x] Log in to Supabase CLI
* [x] Link repository to hosted Supabase project
* [x] Configure local Supabase authentication URLs
* [x] Add `PRODUCT_REQUIREMENTS.md`
* [x] Add `BUILD_PLAN.md`
* [x] Add `DECISIONS.md`
* [x] Add `TASKS.md`
* [x] Add `AGENTS.md`
* [x] Commit and push project documentation

## Phase 1 — Application foundation

### Setup

* [x] Create `phase/01-foundation` branch
* [x] Ask Cursor to inspect repository before editing
* [x] Review Cursor’s proposed Phase 1 plan

### Supabase clients

* [x] Add browser Supabase client
* [x] Add server Supabase client
* [x] Add session refresh handling
* [x] Add environment-variable validation

### Authentication

* [x] Add login page
* [x] Add email magic-link form
* [x] Add authentication callback route
* [x] Add sign-out action
* [x] Protect authenticated routes
* [x] Redirect unauthenticated users to login
* [x] Add authentication error handling

### Profiles

* [x] Create profiles migration
* [x] Add foreign key to `auth.users`
* [x] Add profile timestamps
* [x] Add automatic profile creation trigger
* [x] Enable Row Level Security
* [x] Add profile select policy
* [x] Add profile insert policy
* [x] Add profile update policy
* [x] Add profile page
* [x] Allow display-name editing
* [x] Test profile privacy with two users

### Navigation and appearance

* [x] Add TV Shows route
* [x] Add Movies route
* [x] Add Explore route
* [x] Add Profile route
* [x] Add mobile bottom navigation
* [x] Add desktop navigation
* [x] Add light theme
* [x] Add dark theme
* [x] Add system theme
* [x] Persist theme preference
* [x] Add loading states
* [x] Add error states

### Validation

* [x] Review generated migration
* [x] Apply migration with `npx supabase db push`
* [x] Test magic-link login
* [x] Test auth callback
* [x] Test sign-out
* [x] Test protected routes
* [x] Test profile creation
* [x] Test profile editing
* [x] Test mobile navigation
* [x] Test desktop navigation
* [x] Test dark mode
* [x] Run lint
* [x] Run TypeScript checking
* [x] Run unit tests
* [x] Run production build
* [x] Commit Phase 1
* [x] Push Phase 1 branch
* [X] Create pull request
* [x] Merge Phase 1 into main

## Phase 2 — Deployment and Google authentication

* [x] Import GitHub repository into Vercel
* [x] Add Supabase environment variables to Vercel
* [x] Deploy production application
* [x] Configure Supabase Site URL
* [x] Configure production redirect URL
* [x] Test production magic-link login
* [x] Create Google Cloud project
* [x] Configure OAuth consent screen
* [x] Create Google OAuth web client
* [x] Configure authorized origins
* [x] Configure Supabase callback URL
* [x] Enable Google provider in Supabase
* [x] Add Continue with Google button
* [x] Keep email magic-link as secondary fallback
* [x] Reuse `/auth/callback` for Google and magic-link redirects
* [x] Add friendly OAuth error handling
* [x] Add loading and disabled states for auth actions
* [x] Add automated tests for auth helpers
* [x] Test Google login locally
* [x] Test Google login in production
* [x] Verify secrets are not exposed
* [x] Commit and merge Phase 2

## Phase 3 — TMDB and Explore

* [x] Create TMDB account and credentials
* [x] Add `TMDB_API_READ_TOKEN` locally
* [x] Add TMDB token to Vercel
* [x] Create typed TMDB server client
* [x] Add television search
* [x] Add movie search
* [x] Add trending television
* [x] Add trending movies
* [x] Add media-type filters
* [x] Add debounced search
* [x] Add loading state
* [x] Add empty state
* [x] Add error state
* [x] Create `media_items` migration
* [x] Create `user_shows` migration
* [x] Create `user_movies` migration
* [x] Add indexes
* [x] Add unique constraints
* [x] Add Row Level Security
* [x] Add show to library
* [x] Remove show from library
* [x] Add movie to watchlist
* [x] Remove movie from watchlist
* [x] Prevent duplicate records
* [ ] Test user privacy
* [x] Run validation commands
* [x] Commit and merge Phase 3

## Phase 4 — Television tracking

* [x] Create `episodes` migration
* [x] Create `watched_episodes` migration
* [x] Add indexes and unique constraints
* [x] Add Row Level Security
* [x] Synchronize show metadata
* [x] Synchronize seasons
* [x] Synchronize episodes
* [x] Add show details view
* [x] Add episode list
* [x] Mark episode watched
* [x] Mark episode unwatched
* [x] Edit watched date
* [x] Mark season watched
* [x] Mark season unwatched
* [x] Mark previous episodes watched
* [x] Add Start from Episode 1 option
* [x] Add Select Next Episode option
* [x] Add Select Watched Seasons option
* [x] Add favourite toggle
* [x] Add active status
* [x] Add paused status
* [x] Add dropped status
* [x] Calculate progress
* [x] Exclude future episodes
* [x] Exclude Season 0
* [ ] Add transactional bulk actions
* [ ] Test user privacy
* [ ] Run validation commands
* [x] Commit and merge Phase 4

## Phase 5 — Watch List categories

* [x] Add Watch Next
* [x] Add Recently Watched
* [x] Add Haven’t Watched for a While
* [x] Add Haven’t Started
* [x] Add Caught Up
* [x] Add Completed
* [x] Add Paused
* [x] Add Dropped
* [x] Add Undo watched action
* [x] Add yellow progress bar
* [x] Add green progress bar
* [x] Add purple progress bar
* [x] Ensure categories do not conflict
* [x] Ensure paused shows are excluded from Watch Next
* [x] Ensure dropped shows are excluded from Watch Next
* [x] Test category transitions
* [x] Run validation commands
* [x] Commit and merge Phase 5

## Phase 6 — Upcoming episodes

* [x] Query future episodes
* [x] Exclude Season 0
* [x] Exclude paused shows
* [x] Exclude dropped shows
* [x] Group episodes by date
* [x] Sort dates ascending
* [x] Show all announced future episodes
* [x] Group same-day season releases
* [x] Add grouped-release expansion
* [x] Add timezone-aware display
* [x] Add stale metadata checks
* [x] Add lazy metadata refresh
* [x] Use cached data during TMDB failure
* [x] Test upcoming rules
* [x] Run validation commands
* [x] Commit and merge Phase 6

## Phase 7 — Movies and profile statistics

* [x] Add movie Watch Next
* [x] Add watched movies
* [x] Add movie favourites
* [x] Mark movie watched
* [x] Mark movie unwatched
* [x] Edit movie watched date
* [x] Calculate episodes watched
* [x] Calculate television viewing time
* [x] Add episode-runtime fallback
* [x] Calculate movies watched
* [x] Calculate movie viewing time
* [x] Calculate tracked shows
* [x] Calculate caught-up shows
* [x] Calculate completed shows
* [ ] Add all shows grid (removed from Phase 7 scope; dedicated Shows page)
* [x] Add favourite shows grid
* [ ] Add all movies grid (removed from Phase 7 scope; dedicated Movies page)
* [x] Add favourite movies grid
* [ ] Add paused shows list (removed from Phase 7 scope; dedicated Shows page)
* [ ] Add dropped shows list (removed from Phase 7 scope; dedicated Shows page)
* [x] Format minutes, hours, days and hours
* [x] Label viewing time as estimated
* [x] Test statistics
* [ ] Run validation commands
* [x] Commit and merge Phase 7

## Phase 8 — TV Time import

### Discovery

* [x] Back up original TV Time export
* [x] Create anonymized working copy
* [x] Inspect export file structure
* [x] Document identifiers
* [x] Document watched-date fields
* [x] Document episode records
* [x] Document movie records
* [x] Document favourite fields
* [x] Document missing data
* [x] Create `docs/TVTIME_IMPORT_FORMAT.md`

### Implementation

* [x] Create `imports` migration
* [x] Create import mapping, item, and issue infrastructure
* [x] Enable Row Level Security
* [x] Add ZIP parsing
* [x] Add import adapter
* [x] Add dry-run preview
* [x] Reuse confirmed TV Time source-to-TMDB mappings
* [x] Document that the audited export supplies no usable IMDb IDs
* [x] Document that the audited export supplies no usable TVDB IDs
* [x] Add title and year fallback
* [x] Add season and episode-number matching
* [x] Add ambiguous-match handling
* [x] Add manual resolution
* [x] Add duplicate detection
* [x] Preserve watched dates
* [x] Preserve favourites
* [x] Add transactional import
* [x] Make import idempotent
* [x] Add final import summary
* [x] Add anonymized fixture tests
* [x] Confirm raw ZIP is not stored
* [x] Add persisted aggregate Apply progress and polling UX
* [ ] Production hardening: refactor long-running Apply into bounded resumable requests
* [x] Run validation commands
* [x] Commit and merge Phase 8

## Phase 9 — Export, PWA and polish

* [x] Add user JSON export
* [x] Include provider IDs in export
* [x] Include watched dates in export
* [x] Include tracking statuses in export
* [x] Add PWA manifest
* [x] Add application icons
* [x] Add installable mobile experience
* [x] Add missing-poster fallback
* [x] Add skeleton loading states
* [x] Add error boundaries
* [x] Add resilient import action feedback
* [x] Sanitize user-visible mutation failures
* [x] Review keyboard navigation
* [x] Review focus states
* [x] Review colour contrast
* [x] Test mobile layouts
* [ ] Review application performance
* [ ] Update README
* [ ] Add local setup documentation
* [ ] Add deployment documentation
* [ ] Run final validation
* [ ] Create final release

### Phase 9D.1 — Global accessibility and mobile shell

* [x] Use one shared authenticated main landmark
* [x] Add a keyboard-visible skip-to-content link and stable main target
* [x] Add a shared focus-visible baseline
* [x] Coordinate viewport-fit, safe-area navigation padding, and content clearance
* [x] Add a reduced-motion baseline for pulse and transition effects
* [x] Preserve loading announcements and hide decorative skeletons
* [x] Add focused landmark, skip-link, focus, safe-area, and motion tests

### Phase 9D.2 — Forms, names, grouping, and feedback

* [x] Associate login and profile errors with affected fields
* [x] Group show setup modes and watched seasons with native fieldsets
* [x] Add contextual names and validation hooks to watched-date controls
* [x] Label import uploads, filters, search, manual IDs, and candidate actions
* [x] Remove duplicate poster and favourite announcements from media cards
* [x] Complete progressbar semantics and narrow polling live regions
* [x] Keep route-error controls outside alert regions
* [x] Add focused accessibility render and behavior tests
* [ ] Existing gap: expose the stored profile timezone through a dedicated editor in its owning product scope

### Phase 9D.3 — Mobile layout and zoom/reflow

* [x] Prevent horizontal document overflow on core pages without global overflow clipping
* [x] Add min-w-0 and wrapping for flex/grid titles, descriptions, and controls
* [x] Use one-column media grids below very narrow widths
* [x] Stack dense controls and fit datetime-local, file, select, search, and manual-ID inputs
* [x] Bound detail posters and collapse import candidate layouts when needed
* [x] Preserve Phase 9D.1 and 9D.2 accessibility behavior
* [x] Add focused mobile layout contract tests
* [x] Run validation commands

### Phase 9D.4 — Contrast, touch targets, and visual accessibility

* [x] Add a stronger interactive-boundary token for functional controls
* [x] Improve focus-visible contrast with offset and backup ring
* [x] Enlarge prioritized compact controls to approximately 44×44 CSS pixels
* [x] Keep disabled controls legible without opacity-only cues
* [x] Ensure status, warning, success, and destructive states are not colour-only
* [x] Strengthen progress track/fill contrast with visible state text
* [x] Complete reduced-motion coverage for progress interpolation
* [x] Add focused contrast and visual-accessibility contract tests
* [x] Run validation commands

### Phase 9E.1 — Profile overhaul and settings separation

* [x] Split `/profile` into overview/dashboard and `/profile/settings`
* [x] Keep statistics, favourites, and profile overview on Profile
* [x] Move display name, theme, import, export, and account actions to Settings
* [x] Replace theme select with System / Light / Dark radios
* [x] Apply theme immediately and persist asynchronously with rollback on failure
* [x] Stream statistics behind a Suspense boundary for perceived performance
* [x] Correct browser favicon/metadata branding to TrackTV
* [x] Add focused profile/settings and theme tests
* [x] Run validation commands

### Phase 9E.2 — Watch List prioritization and section controls

* [x] Restrict TV Watch Next to recent watches or newly aired unwatched regular episodes (inclusive 30-day window)
* [x] Prevent Watch Next / Haven’t watched for a while duplication
* [x] Add movie Watch Next quick Mark watched with pending, duplicate-guard, and error feedback
* [x] Show full section counts in Watch List headings
* [x] Limit secondary Watch List sections to 10 items with Show all / Show less
* [x] Keep Watch Next fully visible and preserve section sort order
* [x] Add focused classification, section-control, and movie quick-action tests
* [x] Run validation commands

### Phase 9E.3 — Card consistency, season disclosures, mobile fields, and Explore loading

* [x] Keep date-time controls and their wrappers within narrow mobile containers
* [x] Prevent iOS Safari zoom on Explore search and frequently used watched-date fields
* [x] Use single-line accessible titles on shared compact poster cards
* [x] Make show seasons native accessible disclosures with visible progress
* [x] Collapse Season 0 and deterministically select one regular default season
* [x] Replace stale Explore results with a localized pending skeleton and status
* [x] Preserve server-rendered Explore results through serializable children
* [x] Run validation commands
* [x] Limit Movies Watch Next and Watched to 10 items initially with shared Show all / Show less controls

### Phase 9F.1 — Final UX polish and perceived performance

* [x] Correct Movies card sizing and move Watch Next watched actions onto posters
* [x] Move Explore add/remove actions onto posters and keep detail/setup links
* [x] Correct browser, Apple, and manifest icon metadata and remove the Vercel asset
* [x] Strengthen watched episode rows and disclose watched-date editors on demand
* [x] Keep Shows title and tabs visible in tab loading states
* [x] Include two prior calendar days in Upcoming and initially anchor at Today
* [x] Make route error retry invoke the active boundary reset with pending protection
* [x] Render Profile favourites as single-row poster-only rails
* [x] Collapse Recently Watched by default while preserving the item limiter
* [x] Run lint, type checking, unit tests, and production build
