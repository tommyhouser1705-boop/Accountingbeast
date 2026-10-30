alter table public.demo_profiles add column if not exists office_summary jsonb;

-- Only the authenticated classroom server may inspect registration records.
create or replace function public.demo_class_accounts(p_class uuid)
returns table(email text,account_id uuid,registered_at timestamptz,confirmed_at timestamptz,last_sign_in_at timestamptz,profile_id uuid,business jsonb,office_revision integer,office_summary jsonb)
language sql security definer set search_path = public, pg_temp as $$
 select i.email,u.id,u.created_at,u.email_confirmed_at,u.last_sign_in_at,p.id,p.business,
        coalesce((p.office->>'revision')::integer,0),p.office_summary
 from public.demo_invitations i
 left join auth.users u on lower(trim(u.email))=i.email
 left join public.demo_profiles p on p.id=u.id
 where i.class_id=p_class;
$$;
revoke all on function public.demo_class_accounts(uuid) from public,anon,authenticated;
grant execute on function public.demo_class_accounts(uuid) to service_role;

create or replace function public.demo_save_office_summary(p_student uuid,p_revision integer,p_run jsonb,p_summary jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare saved jsonb;
begin
 saved=public.demo_save_office(p_student,p_revision,p_run);
 update public.demo_profiles
 set office_summary=p_summary || jsonb_build_object('revision',saved->'revision','savedAt',saved->'savedAt')
 where id=p_student;
 return jsonb_build_object('revision',saved->'revision','savedAt',saved->'savedAt');
end $$;
revoke all on function public.demo_save_office_summary(uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.demo_save_office_summary(uuid,integer,jsonb,jsonb) to service_role;

-- Backfill a summary without changing work or overwriting a newer save.
create or replace function public.demo_cache_office_summaries(p_summaries jsonb)
returns void language sql security definer set search_path = public, pg_temp as $$
 update public.demo_profiles p set office_summary=s.value->'summary'
 from jsonb_array_elements(p_summaries) s
 where p.id=(s.value->>'studentId')::uuid
 and (p.office->>'revision')::integer=(s.value->>'revision')::integer;
$$;
revoke all on function public.demo_cache_office_summaries(jsonb) from public,anon,authenticated;
grant execute on function public.demo_cache_office_summaries(jsonb) to service_role;
