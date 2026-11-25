create table correction_internal.offline_receipts (
 author_id uuid not null references public.profiles(id) on delete cascade,
 operation_id uuid not null,
 document_id uuid not null references public.documents(id) on delete cascade,
 request_hash text not null,
 response jsonb not null,
 primary key(author_id,operation_id)
);
revoke all on correction_internal.offline_receipts from public,anon,authenticated;
create index offline_receipts_document on correction_internal.offline_receipts(document_id);

create function correction_internal.offline_snapshot(p_document uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare doc public.documents%rowtype; current_doc jsonb; note_rows jsonb;
begin
 if not public.is_staff() then raise exception 'Reconnecte-toi avec un compte actif.' using errcode='42501'; end if;
 select d.* into doc from public.documents d
 join public.cabinets c on c.id=d.cabinet_id and c.trashed_at is null
 join public.affairs a on a.id=c.affair_id and a.trashed_at is null
 where d.id=p_document and d.status<>'trashed';
 if not found then raise exception 'Ce schéma est indisponible.'; end if;
 select jsonb_build_object('id',d.id,'revision',d.revision,'filename',d.filename) into current_doc
 from public.documents d where d.cabinet_id=doc.cabinet_id and d.status='published'
 order by d.published_at desc,d.id limit 1;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.id),'[]'::jsonb) into note_rows
 from public.annotations a where a.document_id=p_document and (a.visibility='shared' or a.author_id=auth.uid());
 return jsonb_build_object('document',to_jsonb(doc),'current',current_doc,'rows',note_rows);
end;
$$;

create function correction_internal.sync_offline_annotation(
 p_operation uuid,p_document uuid,p_page integer,p_visibility text,p_content text,p_base jsonb,p_revision uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); doc public.documents%rowtype; cabinet uuid; affair uuid;
 current_doc jsonb; existing jsonb; result jsonb; first_id uuid; request_hash text; receipt correction_internal.offline_receipts%rowtype;
begin
 if uid is null or not correction_internal.has_plan_permission('annotate') then
 raise exception 'Ce compte ne peut pas enregistrer de corrections.' using errcode='42501'; end if;
 if p_operation is null or p_document is null or p_page is null or p_page<1 or
 p_visibility is null or p_visibility not in ('shared','personal') or
 p_content is null or not pg_catalog.starts_with(p_content,'EW_DRAW_V1:') or
 jsonb_typeof(substring(p_content from 12)::jsonb)<>'array' or p_base is null or jsonb_typeof(p_base)<>'array'
 then raise exception 'Correction illisible.'; end if;
 request_hash:=encode(extensions.digest(jsonb_build_array(p_document,p_page,p_visibility,p_content,p_base,p_revision)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||p_document::text,10));
 select * into receipt from correction_internal.offline_receipts where author_id=uid and operation_id=p_operation;
 if found then
  if receipt.request_hash<>request_hash then raise exception 'Opération déjà utilisée.'; end if;
  return receipt.response;
 end if;
 select c.id,c.affair_id into cabinet,affair from public.documents d join public.cabinets c on c.id=d.cabinet_id where d.id=p_document;
 perform 1 from public.affairs where id=affair and trashed_at is null for share;
 if not found then raise exception 'L’affaire a été supprimée ou déplacée dans la corbeille.'; end if;
 perform 1 from public.cabinets where id=cabinet and affair_id=affair and trashed_at is null for share;
 if not found then raise exception 'L’armoire a été supprimée ou déplacée dans la corbeille.'; end if;
 select * into doc from public.documents where id=p_document and cabinet_id=cabinet and status<>'trashed' for share;
 if not found then raise exception 'Ce schéma a été supprimé ou déplacé dans la corbeille.'; end if;
 select jsonb_build_object('id',d.id,'revision',d.revision,'filename',d.filename) into current_doc
 from public.documents d where d.cabinet_id=cabinet and d.status='published' order by d.published_at desc,d.id limit 1;
 if (current_doc->>'id')::uuid is distinct from p_revision then
  return jsonb_build_object('status','revision','current',current_doc);
 end if;
 perform 1 from public.annotations a where a.document_id=p_document and a.author_id=uid and a.page=p_page and a.visibility=p_visibility
 and pg_catalog.starts_with(a.content,'EW_DRAW_V1:') order by a.created_at,a.id for update;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'content',a.content) order by a.id),'[]'::jsonb)
 into existing from public.annotations a where a.document_id=p_document and a.author_id=uid and a.page=p_page and a.visibility=p_visibility
 and pg_catalog.starts_with(a.content,'EW_DRAW_V1:');
 if existing<>p_base and jsonb_array_length(existing)=1 and existing->0->>'content'=p_content then
  return jsonb_build_object('status','synced','rows',correction_internal.offline_snapshot(p_document)->'rows');
 end if;
 if existing<>p_base then
  return jsonb_build_object('status','conflict','rows',correction_internal.offline_snapshot(p_document)->'rows');
 end if;
 select a.id into first_id from public.annotations a where a.document_id=p_document and a.author_id=uid and a.page=p_page and a.visibility=p_visibility
 and pg_catalog.starts_with(a.content,'EW_DRAW_V1:') order by a.created_at,a.id limit 1;
 if first_id is null then
  insert into public.annotations(document_id,author_id,page,visibility,content)
  values(p_document,uid,p_page,p_visibility,p_content) returning id into first_id;
 else
  update public.annotations set content=p_content,status='open' where id=first_id;
  -- Keep references from existing reports while consolidating older duplicate drawing rows.
  update public.annotations set content='EW_DRAW_V1:[]' where document_id=p_document and author_id=uid and page=p_page
   and visibility=p_visibility and id<>first_id and pg_catalog.starts_with(content,'EW_DRAW_V1:');
 end if;
 result:=jsonb_build_object('status','synced','rows',correction_internal.offline_snapshot(p_document)->'rows');
 insert into correction_internal.offline_receipts(author_id,operation_id,document_id,request_hash,response)
 values(uid,p_operation,p_document,request_hash,result);
 return result;
end;
$$;

create function public.offline_snapshot(p_document uuid) returns jsonb language sql security invoker set search_path='' as $$
 select correction_internal.offline_snapshot(p_document);
$$;
create function public.sync_offline_annotation(p_operation uuid,p_document uuid,p_page integer,p_visibility text,p_content text,p_base jsonb,p_revision uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select correction_internal.sync_offline_annotation(p_operation,p_document,p_page,p_visibility,p_content,p_base,p_revision);
$$;
revoke all on function correction_internal.offline_snapshot(uuid),public.offline_snapshot(uuid),
 correction_internal.sync_offline_annotation(uuid,uuid,integer,text,text,jsonb,uuid),
 public.sync_offline_annotation(uuid,uuid,integer,text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function correction_internal.offline_snapshot(uuid),public.offline_snapshot(uuid),
 correction_internal.sync_offline_annotation(uuid,uuid,integer,text,text,jsonb,uuid),
 public.sync_offline_annotation(uuid,uuid,integer,text,text,jsonb,uuid) to authenticated;
