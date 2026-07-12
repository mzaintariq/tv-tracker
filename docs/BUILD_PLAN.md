# Personal TV and Movie Tracker — Build Plan

## Development approach

Build the application incrementally.

Complete and test one phase before starting the next.

Do not ask an AI agent to build the complete application in a single change.

For every phase:

1. Inspect the existing repository
2. Present an implementation plan
3. Identify database changes
4. Identify security requirements
5. Implement only the approved phase
6. Add tests
7. Run linting, type checking, tests and production build
8. Manually test the acceptance criteria
9. Commit the phase separately

## Phase 0 — Project setup

### Scope

* Create Next.js application
* Enable TypeScript
* Enable Tailwind CSS
* Install Supabase packages
* Create GitHub repository
* Create Supabase hosted project
* Configure environment variables
* Initialize Supabase CLI
* Link the local repository to Supabase
* Add project documentation
* Add agent instructions

### Required files

```text
docs/
├── PRODUCT_REQUIREMENTS.md
├── BUILD_PLAN.md
├── DECISIONS.md
└── TASKS.md

AGENTS.md
.env.example
```

### Acceptance criteria

* Application runs locally
* Repository is pushed to GitHub
* Supabase project exists
* `.env.local` is ignored by Git
* Supabase CLI is initialized
* Local repository is linked to Supabase
* Documentation is committed

---

## Phase 1 — Application foundation

### Scope

Implement:

* Supabase browser client
* Supabase server client
* Environment-variable validation
* Email magic-link authentication
* Authentication callback
* Sign-out
* Protected application routes
* Profiles table
* Automatic profile creation
* Profile editing
* Row Level Security
* TV Shows placeholder page
* Movies placeholder page
* Explore placeholder page
* Profile page
* Mobile bottom navigation
* Desktop navigation
* Light, dark and system themes
* Loading states
* Error states

Do not implement Google OAuth yet.

Do not implement TMDB yet.

### Database work

Create a migration for:

* `profiles` table
* Foreign key to `auth.users`
* Timestamps
* Automatic profile creation trigger
* Row Level Security
* Select policy
* Insert policy
* Update policy

### Acceptance criteria

* User can request an email magic link
* User can complete login
* User can sign out
* Unauthenticated users cannot access protected routes
* Profile is created automatically
* User can edit their display name
* User cannot access another user’s profile
* Four main navigation destinations work
* Mobile navigation works
* Desktop navigation works
* Theme preference persists
* Lint passes
* Type checking passes
* Tests pass
* Production build passes

---

## Phase 2 — Vercel deployment and Google authentication

### Scope

* Import GitHub repository into Vercel
* Configure production environment variables
* Configure Supabase production URLs
* Configure Google OAuth
* Add Continue with Google button
* Test authentication locally
* Test authentication in production

### Acceptance criteria

* Application deploys successfully
* Production magic-link login works
* Google login works locally
* Google login works in production
* Authentication callback works correctly
* Secrets are not exposed in client code
* Preview and production deployments build successfully

---

## Phase 3 — TMDB integration and Explore

### Scope

Implement:

* TMDB server client
* Typed TMDB response models
* Domain mapping functions
* Search television shows
* Search movies
* Trending television
* Trending movies
* Media-type filters
* Loading states
* Empty states
* Error states
* Media metadata cache
* Add show to library
* Add movie to watchlist
* Remove items from library

### Database work

Create migrations for:

* `media_items`
* `user_shows`
* `user_movies`
* Required indexes
* Unique constraints
* Row Level Security for user-owned records

### Acceptance criteria

* Users can search for shows and movies
* Users can browse trending media
* TMDB token remains server-side
* Users can add and remove media
* Duplicate library entries are prevented
* Cached metadata is stored correctly
* One user cannot access another user’s library

---

## Phase 4 — Television metadata and tracking

### Scope

Implement:

* Show detail view
* Season synchronization
* Episode synchronization
* Episode list
* Mark episode watched
* Mark episode unwatched
* Edit watched date
* Mark season watched
* Mark season unwatched
* Mark all episodes before a selected episode watched
* Start from Episode 1
* Select watched seasons
* Tracking status
* Favourite status
* Progress calculation

### Database work

Create migrations for:

* `episodes`
* `watched_episodes`
* Episode indexes
* Unique constraints
* Row Level Security

### Acceptance criteria

* User can add a show at any progress point
* Episode watch state is stored correctly
* Bulk actions are transactional
* Future episodes are excluded from progress
* Season 0 is excluded from progress
* Favourites work
* Active, paused and dropped states work
* User watch history is private

---

## Phase 5 — Watch List categories

### Scope

Implement:

* Watch Next
* Recently Watched
* Haven’t Watched for a While
* Haven’t Started
* Caught Up
* Completed
* Paused
* Dropped
* Undo watched action
* Progress bars

### Business rules

Watch Next must use the earliest released unwatched regular episode.

Haven’t Watched for a While must use a configurable inactivity threshold, initially 30 days.

Paused and dropped shows must not appear in Watch Next.

### Acceptance criteria

* Shows appear in the correct category
* Shows do not appear in conflicting active categories
* Marking an episode watched updates categories immediately
* Undo restores the previous state
* Progress-bar colours follow approved rules
* Paused and dropped shows are excluded from Watch Next

---

## Phase 6 — Upcoming episodes

### Scope

Implement:

* Future episode queries
* Group episodes by date
* Sort dates ascending
* Show all announced future episodes
* Group same-day season releases
* Expand grouped releases
* Timezone-aware date display
* Metadata stale checks
* Lazy metadata refresh

### Acceptance criteria

* Only active tracked shows appear
* Only future episodes appear
* Episodes are ordered correctly
* Same-day season releases are grouped
* Season 0 is excluded
* Cached data is used when TMDB is unavailable
* Stale metadata is refreshed without repeated unnecessary requests

---

## Phase 7 — Movies and profile statistics

### Scope

Implement:

* Movie Watch Next
* Watched movies
* Movie favourites
* Mark watched
* Mark unwatched
* Edit watched date
* Episode count
* Television viewing time
* Movie viewing time
* Shows tracked
* Shows caught up
* Shows completed
* Favourite shows list
* Favourite movies list
* All shows grid
* All movies grid
* Paused and dropped lists

### Acceptance criteria

* Movie status updates correctly
* Watched dates can be edited
* Runtime fallbacks work
* Statistics match database records
* Viewing time is labelled estimated
* Durations display as months, days and hours
* Lists and grids work on mobile and desktop

---

## Phase 8 — TV Time GDPR import

### Discovery step

Before implementation:

* Inspect the real export structure
* Document file names
* Document identifiers
* Document watched-date fields
* Document movie records
* Document episode records
* Document favourite fields
* Document missing and ambiguous data

Create:

```text
docs/TVTIME_IMPORT_FORMAT.md
```

### Scope

Implement:

* Import adapter
* ZIP parsing
* Dry-run preview
* External-ID matching
* Title matching fallback
* Ambiguous-match handling
* Manual resolution
* Duplicate detection
* Transactional import
* Idempotent import
* Import summary
* Import fixture tests

### Database work

Create migrations for:

* `imports`
* `import_unmatched_items`
* Required indexes
* Row Level Security

### Acceptance criteria

* Watched dates are preserved
* Re-running the import creates no duplicates
* Ambiguous records require user confirmation
* Unmatched records remain available for resolution
* Raw ZIP is not permanently stored
* Final import summary is accurate

---

## Phase 9 — Export, PWA and final polish

### Scope

Implement:

* User JSON export
* Installable PWA
* Application icons
* Manifest
* Mobile installation support
* Accessibility review
* Keyboard navigation
* Performance review
* Missing-poster fallback
* Skeleton states
* Error boundaries
* Deployment documentation
* Setup README

### Acceptance criteria

* User can export their own data
* Export includes external provider IDs
* Application is installable on supported devices
* Core pages work at mobile widths
* Keyboard navigation works
* No serious accessibility issue remains
* A fresh developer can configure the project using the README

---

## Security requirements for every phase

* Never expose the Supabase service-role key
* Never expose the TMDB bearer token
* Never commit `.env.local`
* All user-owned tables must have Row Level Security
* Use `auth.uid()` in user-data policies
* Validate server inputs
* Use transactions for bulk actions
* Prevent duplicate records with database constraints
* Keep shared metadata separate from user watch state
* Do not commit real TV Time GDPR data
* Use anonymized import fixtures only

## Engineering requirements for every phase

* Use strict TypeScript
* Avoid `any`
* Keep business logic outside presentation components
* Keep TMDB API types separate from domain models
* Add loading, empty and error states
* Add tests for important business rules
* Review migrations before applying them
* Run lint before completion
* Run type checking before completion
* Run tests before completion
* Run production build before completion
* Update `docs/TASKS.md`
* Summarize every changed file
