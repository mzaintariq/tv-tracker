-- Distinguish legacy cache rows from rows processed by the rich metadata mapper.
alter table public.media_items
  add column rich_metadata_synced_at timestamptz;

comment on column public.media_items.rich_metadata_synced_at is
  'Last successful core TMDB detail synchronization using the current bounded rich metadata projection. Null rows are stale.';

-- Keep the existing shared trusted-write contract explicit.
revoke insert, update, delete on table public.media_items from authenticated;
grant select on table public.media_items to authenticated;
grant all on table public.media_items to service_role;
