-- SOLO LECTURA. Ejecutar con rol de inspección autorizado; no publicar resultados con datos privados.
begin transaction read only;
select current_database(), current_user, version();
select n.nspname as schema_name,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m') order by 1,2;
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema in ('public','storage') or (table_schema='auth' and table_name='users') order by 1,2,ordinal_position;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname in ('public','storage') order by 1,2,3;
select table_schema,table_name,grantee,privilege_type from information_schema.role_table_grants
where table_schema in ('public','storage') order by 1,2,3;
select n.nspname,p.proname,p.prosecdef,pg_get_function_identity_arguments(p.oid),p.proconfig,p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
select conrelid::regclass,conname,pg_get_constraintdef(oid) from pg_constraint
where connamespace='public'::regnamespace;
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public';
select event_object_table,trigger_name,action_statement from information_schema.triggers where trigger_schema='public';
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets;
select schemaname,viewname,definition from pg_views where schemaname='public';
-- Revisar además en Dashboard: schemas expuestos por PostgREST, Auth Google/URLs/registro/SMTP/rate limits,
-- hooks, Edge Functions y sus secrets, webhooks, logs, copias de seguridad y URL del bucket.
rollback;
