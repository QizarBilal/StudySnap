-- StudySnap SDE learning workspace. Apply with `supabase db push` or the SQL editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  target_role text not null default 'Software Development Engineer',
  weekly_goal_hours numeric(4,1) not null default 10 check (weekly_goal_hours between 0 and 168),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 120),
  description text not null default '',
  position integer not null default 0,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  target_start date,
  target_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (target_start is null or target_end is null or target_end >= target_start)
);

create table if not exists public.roadmap_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phase_id uuid not null,
  parent_topic_id uuid,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  position integer not null default 0,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (id, phase_id, user_id),
  foreign key (phase_id, user_id) references public.roadmap_phases (id, user_id) on delete cascade,
  foreign key (parent_topic_id, phase_id, user_id) references public.roadmap_topics (id, phase_id, user_id) on delete cascade,
  check (parent_topic_id is null or parent_topic_id <> id)
);

create table if not exists public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phase_id uuid,
  topic_id uuid,
  title text not null check (length(trim(title)) between 1 and 180),
  started_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  description text not null default '',
  resource_url text not null default '',
  attachment_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (phase_id, user_id) references public.roadmap_phases (id, user_id) on delete set null (phase_id),
  foreign key (topic_id, user_id) references public.roadmap_topics (id, user_id) on delete set null (topic_id),
  check (resource_url = '' or resource_url ~ '^https?://')
);

create index if not exists roadmap_phases_user_position_idx on public.roadmap_phases (user_id, position);
create index if not exists roadmap_topics_user_phase_position_idx on public.roadmap_topics (user_id, phase_id, position);
create index if not exists roadmap_topics_user_parent_position_idx on public.roadmap_topics (user_id, parent_topic_id, position);
create index if not exists learning_entries_user_started_idx on public.learning_entries (user_id, started_at desc);
create index if not exists learning_entries_user_topic_idx on public.learning_entries (user_id, topic_id);

alter table public.profiles enable row level security;
alter table public.roadmap_phases enable row level security;
alter table public.roadmap_topics enable row level security;
alter table public.learning_entries enable row level security;

revoke all on table public.profiles, public.roadmap_phases, public.roadmap_topics, public.learning_entries from anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.roadmap_phases, public.roadmap_topics, public.learning_entries to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

create policy "roadmap_phases_select_own" on public.roadmap_phases for select to authenticated using ((select auth.uid()) = user_id);
create policy "roadmap_phases_insert_own" on public.roadmap_phases for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "roadmap_phases_update_own" on public.roadmap_phases for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "roadmap_phases_delete_own" on public.roadmap_phases for delete to authenticated using ((select auth.uid()) = user_id);

create policy "roadmap_topics_select_own" on public.roadmap_topics for select to authenticated using ((select auth.uid()) = user_id);
create policy "roadmap_topics_insert_own" on public.roadmap_topics for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "roadmap_topics_update_own" on public.roadmap_topics for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "roadmap_topics_delete_own" on public.roadmap_topics for delete to authenticated using ((select auth.uid()) = user_id);

create policy "learning_entries_select_own" on public.learning_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "learning_entries_insert_own" on public.learning_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "learning_entries_update_own" on public.learning_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "learning_entries_delete_own" on public.learning_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Each user's seeded roadmap is editable after account creation. New users get a complete
-- starting sequence; the app never re-seeds or overwrites changes made by the learner.
create or replace function public.seed_sde_roadmap(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  phase_row jsonb;
  topic_row jsonb;
  child_row jsonb;
  new_phase_id uuid;
  new_topic_id uuid;
  phase_position integer := 0;
  topic_position integer;
  child_position integer;
  roadmap jsonb := '[
    {"title":"Programming foundations","description":"Build fluency in one language, command-line tools, and collaborative version control.","topics":[
      {"title":"Choose your primary language","description":"Pick one language and learn to express solutions clearly.","children":["Syntax, values, and types","Conditionals and loops","Functions and scope","Collections and common data structures","Exceptions and debugging","Modules, packages, and tooling"]},
      {"title":"Object-oriented and functional basics","description":"Learn the ideas that keep code understandable as it grows.","children":["Objects, classes, and interfaces","Composition and encapsulation","Pure functions and immutability","SOLID principles in practice"]},
      {"title":"Developer workflow","description":"Get comfortable working in a real codebase.","children":["Terminal and shell basics","Git commits, branches, and merges","Pull requests and code review","Reading documentation and debugging"]}
    ]},
    {"title":"Data structures and algorithms","description":"Develop a repeatable approach to solving technical problems and explaining trade-offs.","topics":[
      {"title":"Complexity and problem solving","description":"Estimate resource use and turn a prompt into a plan.","children":["Big-O time and space","Constraints and edge cases","Brute force before optimization","Writing and tracing test cases"]},
      {"title":"Arrays, strings, and hashing","description":"The patterns that appear throughout interview problems.","children":["Two pointers and sliding windows","Prefix sums","Hash maps and sets","Sorting and interval merging"]},
      {"title":"Linear data structures","description":"Practice choosing a structure that matches the operation.","children":["Linked lists","Stacks and queues","Monotonic stack and queue","Heaps and priority queues"]},
      {"title":"Recursion and search","description":"Build confidence with state, branching, and search spaces.","children":["Recursion and call stacks","Binary search patterns","Backtracking and pruning","Trees: traversal, BSTs, and tries"]},
      {"title":"Graphs and dynamic programming","description":"Model relationships and solve overlapping subproblems.","children":["Graph representations and traversal","Topological sorting and shortest paths","Dynamic programming states and transitions","Greedy algorithms and proof intuition"]}
    ]},
    {"title":"Computer science core","description":"Understand what your programs rely on underneath the application layer.","topics":[
      {"title":"Databases and SQL","description":"Query, model, and protect application data.","children":["Relational modeling and normalization","Joins, grouping, and subqueries","Indexes and query plans","Transactions and isolation"]},
      {"title":"Operating systems","description":"Understand processes, memory, files, and concurrency.","children":["Processes and threads","Virtual memory and allocation","Scheduling and synchronization","Deadlocks and file systems"]},
      {"title":"Computer networks","description":"Follow a request from the browser to a service.","children":["DNS, TCP, TLS, and HTTP","REST and status codes","Cookies, sessions, and CORS","Latency, retries, and timeouts"]}
    ]},
    {"title":"Backend engineering","description":"Design reliable services, APIs, and data flows.","topics":[
      {"title":"Web services and APIs","description":"Build clear interfaces between clients and services.","children":["HTTP request and response lifecycle","REST resource design","Validation and error handling","API versioning and documentation"]},
      {"title":"Authentication and security","description":"Protect identities, sessions, and application data.","children":["Authentication versus authorization","Password and token handling","Input validation and common web risks","Secrets, permissions, and least privilege"]},
      {"title":"Testing and reliability","description":"Make changes safer and diagnose failures sooner.","children":["Unit and integration tests","Mocks, fixtures, and test data","Structured logs and error reports","Retries, idempotency, and graceful failure"]}
    ]},
    {"title":"Frontend engineering","description":"Create accessible interfaces and understand the client-server boundary.","topics":[
      {"title":"Web platform fundamentals","description":"Learn the browser's core building blocks.","children":["Semantic HTML and forms","CSS layout and responsive design","JavaScript and the event loop","Accessibility and keyboard support"]},
      {"title":"React and application state","description":"Build interfaces from reusable, stateful components.","children":["Components, props, and composition","State, effects, and data fetching","Routing and form handling","Performance and component testing"]}
    ]},
    {"title":"System design and delivery","description":"Connect architecture choices to product needs and operational constraints.","topics":[
      {"title":"System design foundations","description":"Reason about a system before reaching for tools.","children":["Requirements and service boundaries","Caching and invalidation","Queues and asynchronous work","Scaling, availability, and trade-offs"]},
      {"title":"Shipping software","description":"Move code from a local machine to a reliable release.","children":["Linux and process basics","Docker and containers","CI/CD and environment configuration","Cloud deployment and monitoring"]}
    ]},
    {"title":"Projects and job readiness","description":"Turn your knowledge into evidence of engineering judgment.","topics":[
      {"title":"Portfolio projects","description":"Build a few complete products with clear technical decisions.","children":["Scope a real user problem","Design data and API contracts","Build, test, and deploy end to end","Write a concise README and architecture notes"]},
      {"title":"Interview preparation","description":"Practice communicating how you think and work.","children":["Explain DSA solutions aloud","Review core CS fundamentals","Discuss a project and its trade-offs","Prepare behavioral examples"]},
      {"title":"Applications and growth","description":"Create a sustainable process for entering the field.","children":["Resume and project presentation","Targeted applications and referrals","Mock interviews and feedback","Weekly review and next-step planning"]}
    ]}
  ]'::jsonb;
begin
  if exists (select 1 from public.roadmap_phases where user_id = p_user_id) then return; end if;
  for phase_row in select value from jsonb_array_elements(roadmap) loop
    insert into public.roadmap_phases (user_id, title, description, position)
    values (p_user_id, phase_row->>'title', phase_row->>'description', phase_position)
    returning id into new_phase_id;
    topic_position := 0;
    for topic_row in select value from jsonb_array_elements(phase_row->'topics') loop
      insert into public.roadmap_topics (user_id, phase_id, title, description, position)
      values (p_user_id, new_phase_id, topic_row->>'title', topic_row->>'description', topic_position)
      returning id into new_topic_id;
      child_position := 0;
      for child_row in select value from jsonb_array_elements(topic_row->'children') loop
        insert into public.roadmap_topics (user_id, phase_id, parent_topic_id, title, position)
        values (p_user_id, new_phase_id, new_topic_id, trim(both '"' from child_row::text), child_position);
        child_position := child_position + 1;
      end loop;
      topic_position := topic_position + 1;
    end loop;
    phase_position := phase_position + 1;
  end loop;
end;
$$;

revoke all on function public.seed_sde_roadmap(uuid) from public, anon, authenticated;

create or replace function public.handle_new_sde_learner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  perform public.seed_sde_roadmap(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sde_journey on auth.users;
create trigger on_auth_user_created_sde_journey
  after insert on auth.users
  for each row execute procedure public.handle_new_sde_learner();

-- Private learner files are stored under {auth.uid()}/{entry-id}/{filename}.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('learning-files', 'learning-files', false, 26214400, array[
  'application/pdf', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/webp',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed'
]) on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "learner_files_select_own" on storage.objects for select to authenticated
using (bucket_id = 'learning-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "learner_files_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'learning-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "learner_files_update_own" on storage.objects for update to authenticated
using (bucket_id = 'learning-files' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'learning-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "learner_files_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'learning-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
