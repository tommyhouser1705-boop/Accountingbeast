-- Run once in the Supabase SQL editor. Every browser request goes through
-- the classroom Edge Function; authenticated users cannot write these tables.
create table public.demo_access (
 email text primary key check (email = lower(email)),
 role text not null check (role in ('owner','professor','student')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.demo_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null unique,
 business jsonb,
 created_at timestamptz not null default now()
);
create table public.demo_classes (
 id uuid primary key default gen_random_uuid(),
 professor_id uuid not null references public.demo_profiles(id),
 name text not null check (length(name) between 1 and 120),
 created_at timestamptz not null default now()
);
create table public.demo_invitations (
 class_id uuid references public.demo_classes(id) on delete cascade,
 email text not null references public.demo_access(email),
 primary key (class_id,email)
);
create table public.demo_assignments (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.demo_classes(id) on delete cascade,
 definition jsonb not null,
 created_at timestamptz not null default now()
);
create table public.demo_runs (
 student_id uuid references public.demo_profiles(id) on delete cascade,
 assignment_id uuid references public.demo_assignments(id) on delete cascade,
 state jsonb not null,
 revision integer not null default 1,
 updated_at timestamptz not null default now(),
 primary key(student_id,assignment_id)
);
create table public.demo_attempts (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null,
 assignment_id uuid not null,
 revision integer not null,
 action text not null,
 submitted jsonb not null,
 created_at timestamptz not null default now(),
 foreign key(student_id,assignment_id) references public.demo_runs(student_id,assignment_id) on delete cascade,
 unique(student_id,assignment_id,revision)
);
-- No client policies: access is denied by default, including anonymous users.
alter table public.demo_access enable row level security;
alter table public.demo_profiles enable row level security;
alter table public.demo_classes enable row level security;
alter table public.demo_invitations enable row level security;
alter table public.demo_assignments enable row level security;
alter table public.demo_runs enable row level security;
alter table public.demo_attempts enable row level security;
revoke all on public.demo_access,public.demo_profiles,public.demo_classes,public.demo_invitations,public.demo_assignments,public.demo_runs,public.demo_attempts from anon,authenticated;
grant all on public.demo_access,public.demo_profiles,public.demo_classes,public.demo_invitations,public.demo_assignments,public.demo_runs,public.demo_attempts to service_role;
-- Optimistic concurrency + attempt history are one transaction. A stale tab
-- cannot overwrite a saved attempt. The server reconstructs state and scores.
create function public.demo_commit_run(p_student uuid,p_assignment uuid,p_revision integer,p_state jsonb,p_action text,p_submitted jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_revision integer;
begin
 if p_revision=0 then
  insert into public.demo_runs(student_id,assignment_id,state) values(p_student,p_assignment,p_state)
  on conflict do nothing returning revision into v_revision;
 else
  update public.demo_runs set state=p_state,revision=revision+1,updated_at=now()
  where student_id=p_student and assignment_id=p_assignment and revision=p_revision
  returning revision into v_revision;
 end if;
 if v_revision is null then raise exception 'CONFLICT: Work changed in another tab. Reload before submitting.'; end if;
 insert into public.demo_attempts(student_id,assignment_id,revision,action,submitted)
 values(p_student,p_assignment,v_revision,p_action,p_submitted);
 return jsonb_build_object('state',p_state,'revision',v_revision);
end $$;
revoke all on function public.demo_commit_run(uuid,uuid,integer,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.demo_commit_run(uuid,uuid,integer,jsonb,text,jsonb) to service_role;
-- Bootstrap the owner separately with YOUR email; do not use user metadata.
-- insert into public.demo_access(email,role) values('YOUR_EMAIL_HERE','owner');
