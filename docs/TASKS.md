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

* [ ] Create `phase/01-foundation` branch
* [ ] Ask Cursor to inspect repository before editing
* [ ] Review Cursor’s proposed Phase 1 plan

### Supabase clients

* [ ] Add browser Supabase client
* [ ] Add server Supabase client
* [ ] Add session refresh handling
* [ ] Add environment-variable validation

### Authentication

* [ ] Add login page
* [ ] Add email magic-link form
* [ ] Add authentication callback route
* [ ] Add sign-out action
* [ ] Protect authenticated routes
* [ ] Redirect unauthenticated users to login
* [ ] Add authentication error handling

### Profiles

* [ ] Create profiles migration
* [ ] Add foreign key to `auth.users`
* [ ] Add profile timestamps
* [ ] Add automatic profile creation trigger
* [ ] Enable Row Level Security
* [ ] Add profile select policy
* [ ] Add profile insert policy
* [ ] Add profile update policy
* [ ] Add profile page
* [ ] Allow display-name editing
* [ ] Test profile privacy with two users

### Navigation and appearance

* [ ] Add TV Shows route
* [ ] Add Movies route
* [ ] Add Explore route
* [ ] Add Profile route
* [ ] Add mobile bottom navigation
* [ ] Add desktop navigation
* [ ] Add light theme
* [ ] Add dark theme
* [ ] Add system theme
* [ ] Persist theme preference
* [ ] Add loading states
* [ ] Add error states

### Validation

* [ ] Review generated migration
* [ ] Apply migration with `npx supabase db push`
* [ ] Test magic-link login
* [ ] Test auth callback
* [ ] Test sign-out
* [ ] Test protected routes
* [ ] Test profile creation
* [ ] Test profile editing
* [ ] Test mobile navigation
* [ ] Test desktop navigation
* [ ] Test dark mode
* [ ] Run lint
* [ ] Run TypeScript checking
* [ ] Run unit tests
* [ ] Run production build
* [ ] Commit Phase 1
* [ ] Push Phase 1 branch
* [ ] Create pull request
* [ ] Merge Phase 1 into main

## Phase 2 — Deployment and Google authentication

* [ ] Import GitHub repository into Vercel
* [ ] Add Supabase environment variables to Vercel
* [ ] Deploy production application
* [ ] Configure Supabase Site URL
* [ ] Configure production redirect URL
* [ ] Test production magic-link login
* [ ] Create Google Cloud project
* [ ] Configure OAuth consent screen
* [ ] Create Google OAuth web client
* [ ] Configure authorized origins
* [ ] Configure Supabase callback URL
* [ ] Enable Google provider in Supabase
* [ ] Add Continue with Google button
* [ ] Test Google login locally
* [ ] Test Google login in production
* [ ] Verify secrets are not exposed
* [ ] Commit and merge Phase 2

## Phase 3 — TMDB and Explore

* [ ] Create TMDB account and credentials
* [ ] Add `TMDB_API_READ_TOKEN` locally
* [ ] Add TMDB token to Vercel
* [ ] Create typed TMDB server client
* [ ] Add television search
* [ ] Add movie search
* [ ] Add trending television
* [ ] Add trending movies
* [ ] Add media-type filters
* [ ] Add debounced search
* [ ] Add loading state
* [ ] Add empty state
* [ ] Add error state
* [ ] Create `media_items` migration
* [ ] Create `user_shows` migration
* [ ] Create `user_movies` migration
* [ ] Add indexes
* [ ] Add unique constraints
* [ ] Add Row Level Security
* [ ] Add show to library
* [ ] Remove show from library
* [ ] Add movie to watchlist
* [ ] Remove movie from watchlist
* [ ] Prevent duplicate records
* [ ] Test user privacy
* [ ] Run validation commands
* [ ] Commit and merge Phase 3

## Phase 4 — Television tracking

* [ ] Create `episodes` migration
* [ ] Create `watched_episodes` migration
* [ ] Add indexes and unique constraints
* [ ] Add Row Level Security
* [ ] Synchronize show metadata
* [ ] Synchronize seasons
* [ ] Synchronize episodes
* [ ] Add show details view
* [ ] Add episode list
* [ ] Mark episode watched
* [ ] Mark episode unwatched
* [ ] Edit watched date
* [ ] Mark season watched
* [ ] Mark season unwatched
* [ ] Mark previous episodes watched
* [ ] Add Start from Episode 1 option
* [ ] Add Select Next Episode option
* [ ] Add Select Watched Seasons option
* [ ] Add favourite toggle
* [ ] Add active status
* [ ] Add paused status
* [ ] Add dropped status
* [ ] Calculate progress
* [ ] Exclude future episodes
* [ ] Exclude Season 0
* [ ] Add transactional bulk actions
* [ ] Test user privacy
* [ ] Run validation commands
* [ ] Commit and merge Phase 4

## Phase 5 — Watch List categories

* [ ] Add Watch Next
* [ ] Add Recently Watched
* [ ] Add Haven’t Watched for a While
* [ ] Add Haven’t Started
* [ ] Add Caught Up
* [ ] Add Completed
* [ ] Add Paused
* [ ] Add Dropped
* [ ] Add Undo watched action
* [ ] Add yellow progress bar
* [ ] Add green progress bar
* [ ] Add purple progress bar
* [ ] Ensure categories do not conflict
* [ ] Ensure paused shows are excluded from Watch Next
* [ ] Ensure dropped shows are excluded from Watch Next
* [ ] Test category transitions
* [ ] Run validation commands
* [ ] Commit and merge Phase 5

## Phase 6 — Upcoming episodes

* [ ] Query future episodes
* [ ] Exclude Season 0
* [ ] Exclude paused shows
* [ ] Exclude dropped shows
* [ ] Group episodes by date
* [ ] Sort dates ascending
* [ ] Show all announced future episodes
* [ ] Group same-day season releases
* [ ] Add grouped-release expansion
* [ ] Add timezone-aware display
* [ ] Add stale metadata checks
* [ ] Add lazy metadata refresh
* [ ] Use cached data during TMDB failure
* [ ] Test upcoming rules
* [ ] Run validation commands
* [ ] Commit and merge Phase 6

## Phase 7 — Movies and profile statistics

* [ ] Add movie Watch Next
* [ ] Add watched movies
* [ ] Add movie favourites
* [ ] Mark movie watched
* [ ] Mark movie unwatched
* [ ] Edit movie watched date
* [ ] Calculate episodes watched
* [ ] Calculate television viewing time
* [ ] Add episode-runtime fallback
* [ ] Calculate movies watched
* [ ] Calculate movie viewing time
* [ ] Calculate tracked shows
* [ ] Calculate caught-up shows
* [ ] Calculate completed shows
* [ ] Add all shows grid
* [ ] Add favourite shows grid
* [ ] Add all movies grid
* [ ] Add favourite movies grid
* [ ] Add paused shows list
* [ ] Add dropped shows list
* [ ] Format months, days and hours
* [ ] Label viewing time as estimated
* [ ] Test statistics
* [ ] Run validation commands
* [ ] Commit and merge Phase 7

## Phase 8 — TV Time import

### Discovery

* [ ] Back up original TV Time export
* [ ] Create anonymized working copy
* [ ] Inspect export file structure
* [ ] Document identifiers
* [ ] Document watched-date fields
* [ ] Document episode records
* [ ] Document movie records
* [ ] Document favourite fields
* [ ] Document missing data
* [ ] Create `docs/TVTIME_IMPORT_FORMAT.md`

### Implementation

* [ ] Create `imports` migration
* [ ] Create `import_unmatched_items` migration
* [ ] Enable Row Level Security
* [ ] Add ZIP parsing
* [ ] Add import adapter
* [ ] Add dry-run preview
* [ ] Match using TMDB ID
* [ ] Match using IMDb ID
* [ ] Match using TVDB ID
* [ ] Add title and year fallback
* [ ] Add episode-number fallback
* [ ] Add ambiguous-match handling
* [ ] Add manual resolution
* [ ] Add duplicate detection
* [ ] Preserve watched dates
* [ ] Preserve favourites
* [ ] Add transactional import
* [ ] Make import idempotent
* [ ] Add final import summary
* [ ] Add anonymized fixture tests
* [ ] Confirm raw ZIP is not stored
* [ ] Run validation commands
* [ ] Commit and merge Phase 8

## Phase 9 — Export, PWA and polish

* [ ] Add user JSON export
* [ ] Include provider IDs in export
* [ ] Include watched dates in export
* [ ] Include tracking statuses in export
* [ ] Add PWA manifest
* [ ] Add application icons
* [ ] Add installable mobile experience
* [ ] Add missing-poster fallback
* [ ] Add skeleton loading states
* [ ] Add error boundaries
* [ ] Review keyboard navigation
* [ ] Review focus states
* [ ] Review colour contrast
* [ ] Test mobile layouts
* [ ] Review application performance
* [ ] Update README
* [ ] Add local setup documentation
* [ ] Add deployment documentation
* [ ] Run final validation
* [ ] Create final release
