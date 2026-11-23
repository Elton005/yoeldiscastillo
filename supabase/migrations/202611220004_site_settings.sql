-- Aplicar primero en staging, después del núcleo de seguridad. No modifica contenido existente.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.site_settings (
  id smallint primary key check(id=1),
  content jsonb not null default '{}'::jsonb check(jsonb_typeof(content)='object' and octet_length(content::text)<=65536),
  revision integer not null default 1 check(revision>0),
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1);
create table public.site_settings_history (
  revision integer primary key,
  content jsonb not null,
  actor uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index site_settings_history_actor_time on public.site_settings_history(actor,created_at);
alter table public.site_settings enable row level security;
alter table public.site_settings_history enable row level security;
revoke all on public.site_settings,public.site_settings_history from public,anon,authenticated;
grant select on public.site_settings to anon,authenticated;
create policy yc_site_settings_read on public.site_settings for select to anon,authenticated using(id=1);
grant select on public.site_settings_history to authenticated;
create policy yc_site_settings_history_admin on public.site_settings_history for select to authenticated using((select public.current_editor_role())='admin');

create function public.save_site_settings(payload jsonb,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare field record; str text; saved public.site_settings; current_row public.site_settings;
begin
  if coalesce(public.current_editor_role(),'') not in ('admin','editor') then raise exception 'Not authorized' using errcode='42501'; end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>65536 or expected_revision is null then
    raise exception 'Invalid settings' using errcode='22023';
  end if;
  for field in select key,value from jsonb_each(payload) loop
    if field.key='homeImageSize' then
      if jsonb_typeof(field.value)<>'number' or (field.value::text)::numeric<>trunc((field.value::text)::numeric) or (field.value::text)::numeric not between 220 and 420 then raise exception 'Invalid image size' using errcode='22023'; end if;
      continue;
    end if;
    if field.key not in ('homeEyebrow','homeTitle','homeEmphasis','homeDescription','homeImage','homeImageAlt','homeImageShape','homePrimaryLabel','homeSecondaryLabel','homeHighlightsTitle','aboutTitle','aboutSubtitle','aboutBody','aboutImage','booksTitle','booksSubtitle','articlesTitle','articlesSubtitle','contactTitle','contactBody','contactEmail','facebook','instagram','linkedin','footerQuote') or jsonb_typeof(field.value)<>'string' then raise exception 'Invalid field' using errcode='22023'; end if;
    str:=field.value#>>'{}';
    if length(str)>15000 or (length(trim(str))=0 and field.key not in ('facebook','instagram','linkedin')) then raise exception 'Invalid text' using errcode='22023'; end if;
    if field.key in ('homeEyebrow','homeTitle','homeEmphasis','homeImageAlt','homePrimaryLabel','homeSecondaryLabel','homeHighlightsTitle','aboutTitle','booksTitle','articlesTitle','contactTitle') and length(str)>240 then raise exception 'Text too long' using errcode='22023'; end if;
    if (field.key in ('homeDescription','footerQuote') and length(str)>1500) or (field.key in ('aboutSubtitle','booksSubtitle','articlesSubtitle') and length(str)>1000) or (field.key='contactBody' and length(str)>2000) then raise exception 'Text too long' using errcode='22023'; end if;
    if field.key='homeImageShape' and str not in ('rounded','circle','original') then raise exception 'Invalid shape' using errcode='22023'; end if;
    if field.key in ('homeImage','aboutImage','facebook','instagram','linkedin') and str<>'' then
      if length(str)>2048 or str ~ '[[:space:][:cntrl:]\\]' or not (str ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^@]*)?$' or (field.key in ('homeImage','aboutImage') and str ~ '^/[^/].*$')) then raise exception 'Invalid URL' using errcode='22023'; end if;
      if field.key in ('homeImage','aboutImage') and str ~* '\.svg([?#]|$)' then raise exception 'Invalid image' using errcode='22023'; end if;
    end if;
    if field.key='contactEmail' and (length(str)>320 or str !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Invalid email' using errcode='22023'; end if;
  end loop;
  -- Lock serializa la revisión, su historial y la cuota; no sobrescribe una edición concurrente.
  select * into current_row from public.site_settings where id=1 for update;
  if not found or current_row.revision<>expected_revision then raise exception 'Settings changed' using errcode='40001'; end if;
  if (select count(*) from public.site_settings_history where actor=auth.uid() and created_at>now()-interval '1 minute')>=30 then raise exception 'Rate limit exceeded'; end if;
  insert into public.site_settings_history(revision,content,actor) values(current_row.revision,current_row.content,auth.uid());
  update public.site_settings set content=payload,revision=revision+1,updated_at=now() where id=1 returning * into saved;
  return jsonb_build_object('content',saved.content,'revision',saved.revision);
end $$;
revoke all on function public.save_site_settings(jsonb,integer) from public,anon;
grant execute on function public.save_site_settings(jsonb,integer) to authenticated;
commit;
