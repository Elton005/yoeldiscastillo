-- SOLO BASE DE PRUEBAS VACÍA. Contrato inferido, no esquema de producción.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema storage;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,deleted_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth,storage to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;
create table public.libros(id bigint generated always as identity primary key,titulo text not null,subtitulo text,descripcion text,prologo text,imagen_url text,estado text default 'publicado',amazon_url text,apk_url text,fecha_publicacion date,orden integer default 0,creado_en timestamptz default now());
create table public.articulos(id bigint generated always as identity primary key,titulo text not null,categoria text,resumen text,contenido text,imagen_url text,publicado boolean default false,orden integer default 0,creado_en timestamptz default now());
create table public.destacados(id bigint generated always as identity primary key,titulo text not null,tipo text,subtitulo text,descripcion text,imagen_url text,texto_boton text,url_boton text,badge_texto text,activo boolean default false,orden integer default 0);
create table public.administradores(id bigint generated always as identity primary key,email text,nombre text,creado_en timestamptz default now());
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key,bucket_id text,name text);
alter table storage.objects enable row level security;
insert into storage.buckets(id,name,public) values('libros-imagenes','libros-imagenes',true);
-- Políticas permisivas deliberadamente inseguras: comprobar que los fences las limitan.
grant all on public.libros,public.articulos,public.destacados,public.administradores,storage.objects to anon,authenticated;
create policy legacy_allow_all on public.libros for all using(true) with check(true);
create policy legacy_allow_all on public.articulos for all using(true) with check(true);
create policy legacy_allow_all on public.destacados for all using(true) with check(true);
create policy legacy_allow_all on public.administradores for all using(true) with check(true);
create policy legacy_allow_all on storage.objects for all using(true) with check(true);
