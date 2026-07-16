# TV Time GDPR import format

## Audited export

The inspected export is an 805,950-byte ZIP containing 55 CSV files. The importer opens only an explicit allowlist and never persists the ZIP or irrelevant account, token, IP, device, social, or security records.

Primary import sources:

* `tracking-prod-records-v2.csv`: TV episode events and show summary records
* `tracking-prod-records.csv`: legacy episode events and detailed movie records
* `user_tv_show_data.csv`: show titles, follow state, and TV favourites
* `followed_tv_show.csv`: active and archived show state
* `user_show_special_status.csv`: additional TV favourite records
* `lists-prod-lists.csv`: possible movie-favourites list requiring confirmation
* `stats-prod-cache.csv`: aggregate discrepancy reporting only

The export supplies internal TV Time show and episode IDs, show/movie titles, movie release dates, season numbers, and episode numbers. It does not supply usable TMDB, IMDb, or TVDB IDs, original titles, or episode titles.

## Observed scale

* 338 distinct show identities across import-relevant tables
* 311 shows with episode history
* 12,964 TV watch events including two explicit rewatches
* 699 distinct detailed movie identities by normalized title and release date
* Largest distinct coordinate set for one show: 350

The importer caps one TV match context at 2,000 distinct coordinates and 512 KiB serialized, providing more than five times the observed coordinate headroom.

## Timestamp policy

1. A valid legacy `watch_date` Unix epoch value is authoritative.
2. Otherwise, timezone-less `created_at` (`YYYY-MM-DD HH:MM:SS`) is interpreted as UTC.
3. The preview discloses that historical account-local timezone information is unknown.
4. Multiple source events resolving to one episode/movie collapse to the latest source event.
5. Existing TrackTV watched dates are never overwritten.

## Matching

TV matching reuses confirmed TV Time show-ID mappings, then exact normalized titles with compatible TMDB season-summary coverage. Candidate inspection does not synchronize full episode metadata. Full synchronization occurs only after confirmation.

Movie matching prefers exact normalized title plus exact release date, then exact title plus a unique release-year candidate. Alternate-title, nearby-date, and title-only candidates require confirmation.

## Privacy model

Analyze and Apply are separate uploads. Analyze fingerprints and normalizes the ZIP, stores only bounded metadata/mapping context, and discards the ZIP. Apply requires the same ZIP, verifies its fingerprint and item digests, reparses it, applies bounded idempotent work, and discards it again.

Completed or explicitly skipped items set `match_context` to `NULL`. A user may delete one import session while preserving reusable mappings, or forget all TV Time import sessions and mappings. Neither privacy action deletes already-imported TrackTV library/history data.
