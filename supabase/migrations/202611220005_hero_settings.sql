-- Ampliación compatible del JSON de ajustes del hero. No ejecutar sin revisar en staging.
begin;
create or replace function public.save_site_settings(payload jsonb,expected_revision integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare field record; str text; saved public.site_settings; current_row public.site_settings;
begin
  if coalesce(public.current_editor_role(),'') not in ('admin','editor') then raise exception 'Not authorized' using errcode='42501'; end if;
  if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>65536 or expected_revision is null then
    raise exception 'Invalid settings' using errcode='22023';
  end if;
  for field in select key,value from jsonb_each(payload) loop
    if field.key='homeImageSize' then
      if jsonb_typeof(field.value)<>'number' or (field.value::text)::numeric<>trunc((field.value::text)::numeric) or (field.value::text)::numeric not between 220 and 760 then raise exception 'Invalid image size' using errcode='22023'; end if;
      continue;
    end if;
    if field.key not in ('homeEyebrow','homeTitle','homeEmphasis','homeDescription','homeImage','homeBackground','homePrimaryUrl','homeSecondaryUrl','homeImageAlt','homeImageShape','homePrimaryLabel','homeSecondaryLabel','homeHighlightsTitle','aboutTitle','aboutSubtitle','aboutBody','aboutImage','booksTitle','booksSubtitle','articlesTitle','articlesSubtitle','contactTitle','contactBody','contactEmail','facebook','instagram','linkedin','footerQuote') or jsonb_typeof(field.value)<>'string' then raise exception 'Invalid field' using errcode='22023'; end if;
    str:=field.value#>>'{}';
    if length(str)>15000 or (length(trim(str))=0 and field.key not in ('facebook','instagram','linkedin')) then raise exception 'Invalid text' using errcode='22023'; end if;
    if field.key in ('homeEyebrow','homeTitle','homeEmphasis','homeImageAlt','homePrimaryLabel','homeSecondaryLabel','homeHighlightsTitle','aboutTitle','booksTitle','articlesTitle','contactTitle') and length(str)>240 then raise exception 'Text too long' using errcode='22023'; end if;
    if (field.key in ('homeDescription','footerQuote') and length(str)>1500) or (field.key in ('aboutSubtitle','booksSubtitle','articlesSubtitle') and length(str)>1000) or (field.key='contactBody' and length(str)>2000) then raise exception 'Text too long' using errcode='22023'; end if;
    if field.key='homeImageShape' and str not in ('rounded','circle','original') then raise exception 'Invalid shape' using errcode='22023'; end if;
    if field.key in ('homeImage','homeBackground','homePrimaryUrl','homeSecondaryUrl','aboutImage','facebook','instagram','linkedin') and str<>'' then
      if length(str)>2048 or str ~ '[[:space:][:cntrl:]\\]' or not (str ~ '^https://[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^@]*)?$' or (field.key in ('homeImage','homeBackground','homePrimaryUrl','homeSecondaryUrl','aboutImage') and str ~ '^/[^/].*$')) then raise exception 'Invalid URL' using errcode='22023'; end if;
      if field.key in ('homeImage','homeBackground','aboutImage') and str ~* '\.svg([?#]|$)' then raise exception 'Invalid image' using errcode='22023'; end if;
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
