-- Phase 6: explicit freshness for regular-season episode metadata.

alter table public.media_items
add column episodes_synced_at timestamptz;

comment on column public.media_items.episodes_synced_at is
  'Last time all announced regular seasons required for normal TV tracking were successfully synchronized and persisted. Season 0 does not affect this timestamp.';
