-- REVISAR EN STAGING. NO EJECUTAR EN PRODUCCIÓN DURANTE LA CONVIVENCIA CON EL PANEL LEGACY.
-- Aditivo: no borra tablas, filas ni políticas existentes. Los fences RESTRICTIVE limitan políticas permisivas previas.
-- Exportar inspection.sql y snapshot de esquema antes. El rollback requiere el snapshot de RLS/grants/bucket.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$
declare missing text;
begin
  select string_agg(x.name,', ') into missing from (values ('libros'),('articulos'),('destacados'),('administradores')) x(name)
  where to_regclass('public.'||x.name) is null;
  if missing is not null then raise exception 'Schema incompatible: tablas ausentes: %', missing; end if;
  if not exists(select 1 from storage.buckets where id='libros-imagenes') then raise exception 'Bucket ausente: inspeccionar antes de migrar'; end if;
end $$;

-- No se añaden columnas a las tablas de contenido existentes.
-- La visibilidad de libros es una ampliación opcional, separada en supabase/optional/.
create table public.editor_memberships (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null check(role in ('admin','editor')),
  nombre text check(length(nombre)<=150),
  created_at timestamptz not null default now()
);
create table public.editor_role_audit (
  id bigint generated always as identity primary key,
  actor uuid not null, target uuid not null, operation text not null, assigned_role text,
  created_at timestamptz not null default now()
);
create table public.editor_upload_limits (user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null, attempts integer not null);
alter table public.editor_upload_limits enable row level security;
revoke all on public.editor_upload_limits from public,anon,authenticated;
alter table public.editor_memberships enable row level security;
alter table public.editor_role_audit enable row level security;
revoke all on public.editor_memberships,public.editor_role_audit from public,anon,authenticated;

create function public.current_editor_role() returns text
language sql stable security definer set search_path='' as $$
  select m.role from public.editor_memberships m join auth.users u on u.id=m.user_id
  where m.user_id=(select auth.uid()) and u.email_confirmed_at is not null
    and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
$$;
revoke all on function public.current_editor_role() from public;
grant execute on function public.current_editor_role() to anon,authenticated;
create function public.reserve_editorial_upload() returns void
language plpgsql security definer set search_path='' as $$
declare attempts_now integer;
begin
  if coalesce(public.current_editor_role(),'') not in ('admin','editor') then raise exception 'Not authorized' using errcode='42501'; end if;
  insert into public.editor_upload_limits(user_id,window_start,attempts) values(auth.uid(),now(),1)
  on conflict(user_id) do update set
    attempts=case when editor_upload_limits.window_start<now()-interval '1 hour' then 1 else editor_upload_limits.attempts+1 end,
    window_start=case when editor_upload_limits.window_start<now()-interval '1 hour' then now() else editor_upload_limits.window_start end
  returning attempts into attempts_now;
  if attempts_now>30 then raise exception 'Upload limit exceeded'; end if;
end $$;
revoke all on function public.reserve_editorial_upload() from public,anon;
grant execute on function public.reserve_editorial_upload() to authenticated;

create function public.list_editor_memberships()
returns table(user_id uuid,email text,role text,nombre text)
language plpgsql stable security definer set search_path='' as $$
begin
  if public.current_editor_role() is distinct from 'admin' then raise exception 'Not authorized' using errcode='42501'; end if;
  return query select m.user_id,u.email::text,m.role,m.nombre from public.editor_memberships m join auth.users u on u.id=m.user_id order by m.created_at;
end $$;
revoke all on function public.list_editor_memberships() from public,anon;
grant execute on function public.list_editor_memberships() to authenticated;

create function public.manage_editor_membership(operation text,target_email text default null,assigned_role text default null,target_user_id uuid default null,target_name text default null)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid; old_role text;
begin
  -- Un único lock serializa altas/bajas/cambios, incluida la comprobación del último administrador.
  perform pg_advisory_xact_lock(220011);
  if public.current_editor_role() is distinct from 'admin' then raise exception 'Not authorized' using errcode='42501'; end if;
  if (select count(*) from public.editor_role_audit a where a.actor=auth.uid() and a.created_at>now()-interval '1 minute') >= 10 then
    raise exception 'Rate limit exceeded' using errcode='P0001';
  end if;
  if operation='grant' then
    if length(target_name)>150 then raise exception 'Invalid input'; end if;
    if assigned_role is null or assigned_role not in ('admin','editor') or length(target_email)>320 then raise exception 'Invalid input'; end if;
    select u.id into target from auth.users u where lower(u.email)=lower(trim(target_email)) and u.email_confirmed_at is not null
      and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now());
    if target is null then raise exception 'Account unavailable'; end if;
  elsif operation='revoke' then target:=target_user_id;
  else raise exception 'Invalid operation'; end if;
  select m.role into old_role from public.editor_memberships m where m.user_id=target;
  if old_role='admin' and (operation='revoke' or assigned_role is distinct from 'admin') and
    (select count(*) from public.editor_memberships m join auth.users u on u.id=m.user_id where m.role='admin'
      and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now()))<=1 then
    raise exception 'Cannot remove last administrator' using errcode='42501';
  end if;
  if operation='grant' then
    insert into public.editor_memberships(user_id,role,nombre) values(target,assigned_role,nullif(trim(target_name),''))
      on conflict(user_id) do update set role=excluded.role,nombre=coalesce(excluded.nombre,editor_memberships.nombre);
  else
    if old_role is null then raise exception 'Membership unavailable'; end if;
    delete from public.editor_memberships m where m.user_id=target;
  end if;
  insert into public.editor_role_audit(actor,target,operation,assigned_role) values(auth.uid(),target,operation,assigned_role);
end $$;
revoke all on function public.manage_editor_membership(text,text,text,uuid,text) from public,anon;
grant execute on function public.manage_editor_membership(text,text,text,uuid,text) to authenticated;

alter table public.libros enable row level security;
alter table public.articulos enable row level security;
alter table public.destacados enable row level security;
alter table public.administradores enable row level security;
revoke all on public.libros,public.articulos,public.destacados from public,anon,authenticated;
grant select on public.libros,public.articulos,public.destacados to anon,authenticated;
grant insert,update,delete on public.libros,public.articulos,public.destacados to authenticated;
revoke insert,update,delete,truncate,references,trigger on public.libros,public.articulos,public.destacados from anon;
revoke all on public.administradores from anon,authenticated;
create policy yc_legacy_admin_closed on public.administradores as restrictive for all to anon,authenticated using(false) with check(false);
-- Una política permisiva permite el caso válido; el fence restringe también las políticas antiguas.
do $$ declare predicate text; begin
  predicate:=case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='libros' and column_name='visible')
    then 'visible or public.current_editor_role() in (''admin'',''editor'')' else 'true' end;
  execute 'create policy yc_books_read on public.libros for select to anon,authenticated using('||predicate||')';
  execute 'create policy yc_books_fence on public.libros as restrictive for all to anon,authenticated using('||predicate||') with check(public.current_editor_role() in (''admin'',''editor''))';
end $$;
create policy yc_books_write on public.libros for all to authenticated using(public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
create policy yc_articles_read on public.articulos for select to anon,authenticated using(publicado or public.current_editor_role() in ('admin','editor'));
create policy yc_articles_write on public.articulos for all to authenticated using(public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
create policy yc_articles_fence on public.articulos as restrictive for all to anon,authenticated using(publicado or public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
create policy yc_features_read on public.destacados for select to anon,authenticated using(activo or public.current_editor_role() in ('admin','editor'));
create policy yc_features_write on public.destacados for all to authenticated using(public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
create policy yc_features_fence on public.destacados as restrictive for all to anon,authenticated using(activo or public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
-- UPDATE/DELETE necesitan su propio fence: USING de ALL debe permitir lectura de filas públicas.
do $$ declare t text; cmd text; begin
  foreach t in array array['libros','articulos','destacados'] loop
    foreach cmd in array array['update','delete'] loop
      execute format('create policy yc_%s_%s_guard on public.%I as restrictive for %s to anon,authenticated using(public.current_editor_role() in (''admin'',''editor''))',t,cmd,t,cmd);
    end loop;
    -- Solo las secuencias realmente vinculadas a estas tablas, no todas las secuencias de public.
    if pg_get_serial_sequence('public.'||t,'id') is not null then
      execute format('grant usage on sequence %s to authenticated',pg_get_serial_sequence('public.'||t,'id'));
    end if;
  end loop;
end $$;

-- El servidor rechaza tamaños/formatos/URLs; el HTML permanece original y se sanitiza al mostrarlo.
create function public.validate_editorial_record() returns trigger
language plpgsql set search_path='' as $$
declare item jsonb:=to_jsonb(new); k text; v text;
begin
  if coalesce(length(trim(item->>'titulo')),0) not between 1 and 240 then raise exception 'Invalid title'; end if;
  if coalesce((item->>'orden')::numeric,0) not between 0 and 1000000 then raise exception 'Invalid order'; end if;
  foreach k in array array['descripcion','prologo','resumen'] loop
    if length(coalesce(item->>k,''))>20000 then raise exception 'Text too long'; end if;
  end loop;
  if length(coalesce(item->>'subtitulo',''))>500 or length(coalesce(item->>'categoria',''))>200
    or length(coalesce(item->>'texto_boton',''))>100 or length(coalesce(item->>'badge_texto',''))>100 then raise exception 'Text too long'; end if;
  if item->>'estado' is not null and item->>'estado' not in ('publicado','proximamente','agotado') then raise exception 'Invalid state'; end if;
  if item->>'tipo' is not null and item->>'tipo' not in ('libro','articulo','app','personalizado') then raise exception 'Invalid type'; end if;
  foreach k in array array['imagen_url','amazon_url','apk_url','url_boton'] loop
    v:=item->>k;
    if v is not null and v<>'' and (length(v)>2048 or v ~ '[[:space:]\\]' or v !~ '^(https://[^/@]+[^@]*|/[^/].*|img/.*|libros\.html.*|articulos\.html.*|sobre-mi\.html.*|contacto\.html.*)$') then raise exception 'Invalid URL'; end if;
  end loop;
  if length(coalesce(item->>'contenido',''))>2000000 then raise exception 'Content too long'; end if;
  return new;
end $$;
create trigger yc_books_validate before insert or update on public.libros for each row execute function public.validate_editorial_record();
create trigger yc_articles_validate before insert or update on public.articulos for each row execute function public.validate_editorial_record();
create trigger yc_features_validate before insert or update on public.destacados for each row execute function public.validate_editorial_record();

-- Bucket existente; las URLs antiguas siguen disponibles. No mover ni borrar objetos existentes.
update storage.buckets set file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif'] where id='libros-imagenes';
create policy yc_media_read on storage.objects for select to anon,authenticated using(bucket_id='libros-imagenes');
-- Cargas solo desde Edge Function: la firma del archivo no se puede validar con RLS.
create policy yc_media_insert_fence on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'libros-imagenes');
create policy yc_media_update_fence on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'libros-imagenes') with check(bucket_id<>'libros-imagenes');
-- Borrado exclusivamente a través de RPC y Storage API. No borrar filas directamente de storage.objects.
create policy yc_media_delete_fence on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'libros-imagenes');
commit;
