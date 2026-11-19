-- Kanchana Sadaruwan Education: Supabase schema
-- Run this whole file in Supabase SQL Editor AFTER creating a project.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'student' check (role in ('teacher','student')),
 student_id uuid,
 created_at timestamptz not null default now()
);
create or replace function public.is_teacher() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='teacher');
$$;
create table if not exists public.registration_requests (
 id uuid primary key default gen_random_uuid(), student_name text not null, parent_name text not null,
 parent_phone text not null, grade int not null check(grade between 1 and 11),
 subject text not null, medium text not null, status text not null default 'pending',
 created_at timestamptz not null default now()
);
create or replace function public.submit_registration(p_student_name text,p_parent_name text,p_parent_phone text,p_grade int,p_subject text,p_medium text)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
 if length(trim(p_student_name)) not between 2 and 100 or length(trim(p_parent_name)) not between 2 and 100
 or length(trim(p_parent_phone)) not between 7 and 20 or p_grade not between 1 and 11
 or p_subject not in ('Mathematics','Science','English') or p_medium not in ('Sinhala','English','Tamil') then
 raise exception 'Please check the registration details.';
 end if;
 insert into public.registration_requests(student_name,parent_name,parent_phone,grade,subject,medium)
 values(trim(p_student_name),trim(p_parent_name),trim(p_parent_phone),p_grade,p_subject,p_medium) returning id into new_id;
 return new_id;
end; $$;
grant execute on function public.submit_registration(text,text,text,int,text,text) to anon,authenticated;
create table if not exists public.students (
 id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id) on delete set null,
 registration_no text unique not null, full_name text not null, grade int not null check(grade between 1 and 11),
 medium text not null, parent_phone text, status text not null default 'active', created_at timestamptz default now()
);
alter table public.profiles drop constraint if exists profiles_student_id_fkey;
alter table public.profiles add constraint profiles_student_id_fkey foreign key(student_id) references public.students(id) on delete set null;
create table if not exists public.timetable (
 id uuid primary key default gen_random_uuid(), grade int not null, subject text not null, medium text not null,
 day_of_week text not null, start_time text not null, end_time text not null, venue text, created_at timestamptz default now()
);
create table if not exists public.attendance (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 class_date date not null, status text not null check(status in ('Present','Absent','Late')), note text,
 created_at timestamptz default now()
);
create table if not exists public.exams (
 id uuid primary key default gen_random_uuid(), exam_name text not null, grade int not null, subject text not null,
 exam_date date, max_marks numeric not null default 100, created_at timestamptz default now()
);
create table if not exists public.results (
 id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade, marks numeric not null,
 created_at timestamptz default now(), unique(exam_id,student_id)
);
create table if not exists public.resources (
 id uuid primary key default gen_random_uuid(), title text not null, resource_type text not null,
 grade int, subject text, medium text, file_url text, published boolean not null default false, created_at timestamptz default now()
);
create table if not exists public.notices (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null,
 published boolean not null default true, created_at timestamptz default now()
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
 amount numeric not null check(amount>=0), paid_on date not null default current_date, month text, note text,
 created_at timestamptz default now()
);
-- Create profile automatically for every auth signup. New users are students by default.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,role) values(new.id,'student') on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
-- Enable RLS and start from deny-by-default.
do $$ declare t text; begin foreach t in array array['profiles','registration_requests','students','timetable','attendance','exams','results','resources','notices','payments'] loop
 execute format('alter table public.%I enable row level security',t);
end loop; end $$;
drop policy if exists "profile self or teacher read" on public.profiles;
create policy "profile self or teacher read" on public.profiles for select to authenticated using(id=auth.uid() or public.is_teacher());
drop policy if exists "teacher update profiles" on public.profiles;
create policy "teacher update profiles" on public.profiles for update to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "teacher manage registrations" on public.registration_requests;
create policy "teacher manage registrations" on public.registration_requests for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "teacher manage students" on public.students;
create policy "teacher manage students" on public.students for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "student read own student row" on public.students;
create policy "student read own student row" on public.students for select to authenticated using(auth_user_id=auth.uid());
drop policy if exists "teacher manage timetable" on public.timetable;
create policy "teacher manage timetable" on public.timetable for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "students read timetable" on public.timetable;
create policy "students read timetable" on public.timetable for select to authenticated using(true);
drop policy if exists "teacher manage attendance" on public.attendance;
create policy "teacher manage attendance" on public.attendance for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "student read own attendance" on public.attendance;
create policy "student read own attendance" on public.attendance for select to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
drop policy if exists "teacher manage exams" on public.exams;
create policy "teacher manage exams" on public.exams for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "students read exams" on public.exams;
create policy "students read exams" on public.exams for select to authenticated using(true);
drop policy if exists "teacher manage results" on public.results;
create policy "teacher manage results" on public.results for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "student read own results" on public.results;
create policy "student read own results" on public.results for select to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
drop policy if exists "teacher manage resources" on public.resources;
create policy "teacher manage resources" on public.resources for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "public read published resources" on public.resources;
create policy "public read published resources" on public.resources for select to anon,authenticated using(published=true);
drop policy if exists "teacher manage notices" on public.notices;
create policy "teacher manage notices" on public.notices for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "public read published notices" on public.notices;
create policy "public read published notices" on public.notices for select to anon,authenticated using(published=true);
drop policy if exists "teacher manage payments" on public.payments;
create policy "teacher manage payments" on public.payments for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "student read own payments" on public.payments;
create policy "student read own payments" on public.payments for select to authenticated using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
-- Promote the teacher only AFTER they sign up: replace email below with teacher's login email.
-- update public.profiles set role='teacher' where id=(select id from auth.users where email='TEACHER_EMAIL_HERE');
