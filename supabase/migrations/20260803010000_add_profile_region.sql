alter table public.profiles
add column region text null
constraint profiles_region_iso_alpha_2_check
check (region is null or region ~ '^[A-Z]{2}$');

comment on column public.profiles.region is
  'Owner-selected ISO 3166-1 alpha-2 country code for regional release, streaming-provider, and certification information; independent of timezone.';
