-- Solo lectura, para un operador autorizado. No cambia roles, usuarios ni RLS.
-- Ejecutar en SQL Editor y conservar el resultado antes de planificar migraciones.
begin read only;
select to_regclass('public.administradores') as legacy_admins,
       to_regclass('public.editor_memberships') as memberships,
       to_regprocedure('public.current_editor_role()') as role_rpc;

select p.oid::regprocedure as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       p.proconfig as function_config
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='current_editor_role';

select c.relname, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('administradores','editor_memberships','libros','articulos','destacados','site_settings');

select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies where schemaname='public' and tablename in
  ('administradores','editor_memberships','libros','articulos','destacados','site_settings')
order by tablename, policyname;
rollback;
