# Personal TV and Movie Tracker — Product Requirements

## 1. Product overview

Build a simple, fast and mobile-friendly personal alternative to TV Time.

The application is focused on tracking television shows, episodes and movies. It does not need TV Time’s social, community or discussion features.

The application should allow multiple family members to create separate accounts and maintain private watch histories.

## 2. Product goals

Users should be able to:

* Add television shows and movies to their library
* Track watched television episodes
* See the next episode they should watch
* See upcoming episodes from tracked shows
* Track movies they intend to watch
* Mark movies as watched
* View viewing statistics
* Favourite shows and movies
* Import existing TV Time GDPR data
* Export their own application data
* Use the application comfortably on mobile and desktop
* Use light, dark or system theme

## 3. Technology requirements

Use:

* Next.js
* React
* TypeScript
* Next.js App Router
* Tailwind CSS
* Supabase Postgres
* Supabase Auth
* Supabase Row Level Security
* TMDB API for television and movie metadata
* Vercel for deployment
* Vitest for unit tests
* Playwright for important end-to-end tests

Do not introduce a separate Express backend unless a clear technical need appears.

## 4. Authentication requirements

Each family member must have a separate account.

Support:

* Google sign-in
* Email magic-link sign-in
* Sign-out
* Protected routes
* Automatic profile creation

Google sign-in can be added after the initial application is deployed to Vercel.

Each user must only be able to access their own:

* Profile
* Show library
* Watched episodes
* Movie library
* Favourites
* Watch history
* Imports
* Settings

All user-owned tables must use Supabase Row Level Security.

## 5. Main navigation

The authenticated application must have four primary destinations:

1. TV Shows
2. Movies
3. Explore
4. Profile

On mobile, use a fixed bottom navigation bar.

On desktop, use a sidebar or top navigation.

## 6. TV Shows section

The TV Shows section must contain two main views:

* Watch List
* Upcoming

### 6.1 Watch Next

For each active tracked show, calculate the earliest released regular episode that the user has not watched.

Display:

* Poster
* Show title
* Season and episode number
* Episode title
* Progress
* Mark Watched action

Format episode numbers like:

```text
S01 | E02
```

Do not store a permanent “next episode” value. Derive it from episode and watched-episode data.

Exclude:

* Future episodes
* Season 0 and specials
* Paused shows
* Dropped shows

### 6.2 Recently Watched

Display recently watched episodes ordered by watched date.

Allow users to:

* Undo watched status
* Edit watched date
* Open the parent show

### 6.3 Haven’t Watched for a While

Display shows where:

* At least one episode has been watched
* At least one released episode remains unwatched
* No episode has been watched during the previous 30 days
* The show is active

The 30-day threshold should be stored as a configurable value.

### 6.4 Haven’t Started

Display tracked shows with no watched episodes.

### 6.5 Caught Up

Display ongoing shows where every currently released regular episode has been watched.

Future episodes must not reduce current progress.

### 6.6 Completed

Display ended shows where every released regular episode has been watched.

### 6.7 Paused

Paused shows remain in the library but do not appear in Watch Next or Upcoming.

### 6.8 Dropped

Dropped shows remain in the library but do not appear in Watch Next or Upcoming.

## 7. Adding a partially watched show

When adding a television show, support all three options:

1. Start from Season 1, Episode 1
2. Select an episode and mark everything before it as watched
3. Select complete seasons that have already been watched

Bulk watch actions must be transactional.

## 8. Show details

A show page or mobile drawer should display:

* Poster
* Title
* Release year
* Show status
* Favourite status
* Tracking status
* Overall progress
* Seasons
* Episodes
* Episode air dates
* Episode runtimes where available

Provide actions to:

* Mark an episode watched
* Mark an episode unwatched
* Edit watched date
* Mark a season watched
* Mark a season unwatched
* Mark all episodes before a selected episode watched
* Favourite or unfavourite
* Pause or drop the show
* Remove the show from the library

Detailed episode pages are not required.

## 9. Upcoming episodes

Display all announced future episodes from active tracked shows.

Group episodes by premiere date.

Each entry should show:

* Poster thumbnail
* Show title
* Season and episode number
* Episode title when available
* Air date

When multiple episodes from one season release on the same date, group them into one compact season-release entry.

Example:

```text
Stranger Things — Season 6
8 episodes releasing July 20
```

Users should be able to expand grouped releases to view individual episodes.

## 10. Progress calculation

Exclude Season 0 and specials by default.

Calculate progress using:

```text
Watched released regular episodes
÷
Total released regular episodes
```

Do not include future episodes in the denominator.

Progress-bar rules:

* No episodes watched: no progress bar
* Partially watched: yellow percentage bar
* All released episodes watched and show ongoing: full green bar
* All episodes watched and show ended: full purple bar
* Show ended but incomplete: yellow percentage bar

## 11. Movies section

The Movies section must contain:

* Watch Next
* Watched
* Favourites

### Watch Next

Display movies added to the user’s library but not watched (`watched_at IS NULL`).

### Watched

Display watched movies (`watched_at IS NOT NULL`) ordered by watched date.

Movie watch state is derived from `watched_at` only. Do not use a separate movie status column. Favourites use a separate `is_favourite` boolean.

Allow users to:

* Add a movie
* Remove a movie
* Mark watched
* Mark unwatched
* Edit watched date
* Favourite or unfavourite

A full movie-detail page is not required for the MVP. A modal or drawer is sufficient.

## 12. Explore section

The Explore section must contain:

* Search bar
* All media filter
* TV Shows filter
* Movies filter
* Trending television shows
* Trending movies

Each result card should display:

* Poster
* Title
* Release year
* Media type
* Current library state
* Add or remove action

Search should be debounced.

The application must prevent duplicate library records.

## 13. Profile section

Display:

* Avatar
* Display name
* Email
* Theme preference
* Timezone

Display statistics for:

* Episodes watched
* Estimated television viewing time
* Movies watched
* Movie viewing time
* Shows tracked
* Shows caught up
* Shows completed
* Favourite shows
* Favourite movies

Television time should use:

1. Episode runtime when available
2. Show average runtime as a fallback
3. Exclude the episode from duration totals when no runtime is available

Viewing time should be clearly labelled as estimated.

Format large durations using months, days and hours.

For display purposes:

```text
1 month = 30 days
```

## 14. Themes

Support:

* Light theme
* Dark theme
* System theme

Persist the user’s selected theme between visits.

## 15. TMDB integration

Use TMDB for:

* Television search
* Movie search
* Trending television
* Trending movies
* Show details
* Seasons
* Episodes
* Air dates
* Posters
* Movie details
* Runtimes
* Show status

All TMDB requests must run server-side.

Never expose the TMDB API token to browser code.

Cache metadata in Supabase to reduce unnecessary TMDB requests.

Supabase remains the source of truth for user watch state.

## 16. TV Time GDPR import

Do not implement the importer until the real export format has been inspected.

The importer must:

* Accept the TV Time export
* Preserve watched dates
* Preserve favourites where available
* Match records using external IDs where possible
* Avoid duplicate records
* Support repeated imports safely
* Display matched records
* Display unmatched records
* Display ambiguous records
* Allow manual matching
* Show a dry-run preview before applying changes
* Avoid permanently storing the original export ZIP
* Produce an import summary

Matching priority:

1. TMDB ID
2. IMDb ID
3. TVDB ID
4. Title and release year
5. Title, season number and episode number

Never silently accept an ambiguous title match.

## 17. User-owned export

Users must be able to export their own data as JSON.

Include:

* Profile preferences
* Tracked shows
* Provider IDs
* Tracking statuses
* Watched episodes
* Watched dates
* Movies
* Movie watched dates
* Favourites

The export should be sufficient to restore the user’s library without depending only on internal database IDs.

## 18. Responsive and accessibility requirements

The application must be mobile-first.

Include:

* Large touch targets
* Responsive poster grids
* Keyboard navigation
* Visible focus states
* Loading states
* Empty states
* Error states
* Missing-poster fallbacks
* Accessible labels
* Readable text contrast

Avoid excessive animation.

## 19. Features excluded from the MVP

Do not build:

* Comments
* Community posts
* User reviews
* Reactions
* Social following
* Messaging
* Public profiles
* Public lists
* Community ratings
* Cast and crew pages
* Detailed episode pages
* Subscription billing
* Admin dashboard
* Streaming-provider information
* Notifications
* Recommendation algorithms

## 20. Successful MVP definition

The MVP is successful when a user can:

1. Sign in privately
2. Add shows and movies
3. Track watched episodes
4. See their next episode
5. See upcoming episodes
6. Track movies to watch
7. View accurate progress
8. View estimated statistics
9. Import previous watch history
10. Export their own data
11. Use the application comfortably on mobile
