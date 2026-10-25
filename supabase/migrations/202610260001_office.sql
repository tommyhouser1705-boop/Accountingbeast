alter table public.demo_profiles add column if not exists office jsonb;
create or replace function public.demo_save_office(p_student uuid,p_revision integer,p_run jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare saved jsonb;
begin
 update public.demo_profiles
 set office=jsonb_build_object('revision',p_revision+1,'run',p_run,'savedAt',now())
 where id=p_student and coalesce((office->>'revision')::integer,0)=p_revision
 returning office into saved;
 if saved is null then raise exception 'CONFLICT: Office changed in another tab. Reload before continuing.'; end if;
 return saved;
end $$;
revoke all on function public.demo_save_office(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.demo_save_office(uuid,integer,jsonb) to service_role;
