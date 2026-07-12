-- Harden handle_new_user against search_path injection.
-- Keep security definer, but clear search_path and schema-qualify all relations.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_name text;
begin
  derived_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');

  insert into public.profiles (id, display_name)
  values (new.id, derived_name);

  return new;
end;
$$;
