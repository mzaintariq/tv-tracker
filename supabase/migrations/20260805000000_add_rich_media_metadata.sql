-- Small, stable TMDB metadata shared by every user of a media item.

alter table public.media_items
  add column genres jsonb not null default '[]'::jsonb,
  add column vote_average numeric(4,2),
  add column vote_count integer,
  add column original_language text,
  add column last_air_date date,
  add column networks jsonb not null default '[]'::jsonb,
  add column creators jsonb not null default '[]'::jsonb,
  add column origin_countries jsonb not null default '[]'::jsonb,
  add column production_companies jsonb not null default '[]'::jsonb;

alter table public.media_items
  add constraint media_items_genres_shape check (jsonb_typeof(genres) = 'array' and jsonb_array_length(genres) <= 20),
  add constraint media_items_vote_average_range check (vote_average is null or (vote_average >= 0 and vote_average <= 10)),
  add constraint media_items_vote_count_range check (vote_count is null or vote_count >= 0),
  add constraint media_items_original_language_shape check (original_language is null or original_language ~ '^[a-z]{2,3}$'),
  add constraint media_items_networks_shape check (jsonb_typeof(networks) = 'array' and jsonb_array_length(networks) <= 20),
  add constraint media_items_creators_shape check (jsonb_typeof(creators) = 'array' and jsonb_array_length(creators) <= 10),
  add constraint media_items_origin_countries_shape check (jsonb_typeof(origin_countries) = 'array' and jsonb_array_length(origin_countries) <= 10),
  add constraint media_items_production_companies_shape check (jsonb_typeof(production_companies) = 'array' and jsonb_array_length(production_companies) <= 20);

comment on column public.media_items.genres is 'Bounded TMDB genre projections: stable numeric ID and display name.';
comment on column public.media_items.vote_average is 'TMDB vote average from the latest successful core metadata synchronization.';
comment on column public.media_items.vote_count is 'TMDB vote count from the latest successful core metadata synchronization.';
comment on column public.media_items.original_language is 'Normalized TMDB ISO 639 language code.';
comment on column public.media_items.last_air_date is 'TV-only last air date; null for movies or when unavailable.';
comment on column public.media_items.networks is 'TV-only bounded TMDB network projections: stable numeric ID and display name.';
comment on column public.media_items.creators is 'TV-only bounded TMDB creator projections: stable numeric ID and display name.';
comment on column public.media_items.origin_countries is 'TV-only bounded uppercase ISO 3166-1 alpha-2 origin country codes.';
comment on column public.media_items.production_companies is 'Movie-only bounded TMDB company projections: stable numeric ID and display name.';

-- Preserve the existing trusted-write model explicitly.
revoke insert, update, delete on table public.media_items from authenticated;
grant select on table public.media_items to authenticated;
grant all on table public.media_items to service_role;
