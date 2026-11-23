-- Conserva los controles de orden originales, con una única transacción en servidor.
begin;
create function public.reorder_editorial_content(table_name text,record_id text,direction text)
returns void language plpgsql security definer set search_path='' as $$
declare identifiers text[]; position_now integer; position_next integer; moved text;
begin
  if coalesce(public.current_editor_role(),'') not in ('admin','editor') then raise exception 'Not authorized' using errcode='42501'; end if;
  if table_name is null or table_name not in ('libros','articulos','destacados') or direction is null or direction not in ('up','down') then raise exception 'Invalid input'; end if;
  perform pg_advisory_xact_lock(hashtext('yc_order_'||table_name));
  -- Serialize against regular content edits too; no partially swapped positions.
  execute format('lock table public.%I in share row exclusive mode',table_name);
  execute format('select array_agg(id::text order by orden asc nulls last,id) from public.%I',table_name) into identifiers;
  position_now:=array_position(identifiers,record_id);
  if position_now is null then raise exception 'Record unavailable'; end if;
  position_next:=position_now+case when direction='up' then -1 else 1 end;
  if position_next<1 or position_next>array_length(identifiers,1) then return; end if;
  moved:=identifiers[position_now];identifiers[position_now]:=identifiers[position_next];identifiers[position_next]:=moved;
  execute format('update public.%I as item set orden=ordering.position from unnest($1::text[]) with ordinality as ordering(id,position) where item.id::text=ordering.id',table_name) using identifiers;
end $$;
revoke all on function public.reorder_editorial_content(text,text,text) from public,anon;
grant execute on function public.reorder_editorial_content(text,text,text) to authenticated;
commit;
