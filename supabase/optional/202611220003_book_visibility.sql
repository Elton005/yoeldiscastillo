-- OPCIONAL. Fuera de migrations/ para no alterar el catálogo original por defecto.
-- Solo aplicar en staging y después de solicitar esta ampliación, no para migrar el diseño.
begin;
set local lock_timeout='5s';
alter table public.libros add column if not exists visible boolean not null default true;
drop policy yc_books_read on public.libros;
drop policy yc_books_fence on public.libros;
create policy yc_books_read on public.libros for select to anon,authenticated using(visible or public.current_editor_role() in ('admin','editor'));
create policy yc_books_fence on public.libros as restrictive for all to anon,authenticated using(visible or public.current_editor_role() in ('admin','editor')) with check(public.current_editor_role() in ('admin','editor'));
commit;
