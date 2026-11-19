-- Production workflow foundation. Run AFTER supabase-schema.sql and 002_commercial_suite.sql.
create extension if not exists pgcrypto;

-- Publish control for online lessons. Only explicitly published sessions are visible to learners.
alter table public.online_sessions add column if not exists published boolean not null default false;
drop policy if exists "students read online sessions" on public.online_sessions;
create policy "students read published online sessions" on public.online_sessions
for select to authenticated using(published=true);

alter table public.guardian_students add column if not exists created_at timestamptz not null default now();
alter table public.website_settings add column if not exists created_at timestamptz not null default now();

-- Parent/student invoice ledger. This is a record of charges, not a payment gateway.
create table if not exists public.invoices(
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.students(id) on delete cascade,
 invoice_number text not null unique,
 description text not null,
 amount numeric(12,2) not null check(amount>0),
 due_on date,
 status text not null default 'unpaid' check(status in ('unpaid','part_paid','paid','void')),
 created_at timestamptz not null default now()
);
alter table public.invoices enable row level security;
drop policy if exists "teacher manage invoices" on public.invoices;
create policy "teacher manage invoices" on public.invoices for all to authenticated
using(public.is_teacher()) with check(public.is_teacher());
drop policy if exists "students read own invoices" on public.invoices;
create policy "students read own invoices" on public.invoices for select to authenticated
using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
drop policy if exists "parents read linked invoices" on public.invoices;
create policy "parents read linked invoices" on public.invoices for select to authenticated
using(exists(select 1 from public.guardian_students g where g.student_id=invoices.student_id and g.guardian_user_id=auth.uid()));
create index if not exists invoices_student_created_idx on public.invoices(student_id,created_at desc);

-- In-app inbox: users can read only messages addressed to their own account.
drop policy if exists "recipient read own messages" on public.messages;
create policy "recipient read own messages" on public.messages for select to authenticated
using(recipient_user_id=auth.uid());

-- Quiz questions are never directly readable by learners because answer_key is private.
create or replace function public.get_quiz_questions(p_quiz_id uuid)
returns table(id uuid,question text,question_type text,options jsonb,marks numeric)
language plpgsql stable security definer set search_path=public as $$
declare sid uuid;
begin
 select s.id into sid from public.students s where s.auth_user_id=auth.uid();
 if sid is null then raise exception 'Student account is not linked.'; end if;
 if not exists(select 1 from public.quizzes q where q.id=p_quiz_id and q.published=true
   and (q.grade is null or q.grade=(select grade from public.students where id=sid))
   and (q.opens_at is null or q.opens_at<=now()) and (q.closes_at is null or q.closes_at>=now())) then
   raise exception 'Quiz is not available.';
 end if;
 return query select qq.id,qq.question,qq.question_type,qq.options,qq.marks
 from public.quiz_questions qq where qq.quiz_id=p_quiz_id order by qq.created_at,qq.id;
end; $$;
revoke all on function public.get_quiz_questions(uuid) from public;
grant execute on function public.get_quiz_questions(uuid) to authenticated;

delete from public.quiz_attempts a using public.quiz_attempts b where a.quiz_id=b.quiz_id and a.student_id=b.student_id and a.ctid>b.ctid;
create unique index if not exists quiz_attempt_one_per_student_idx on public.quiz_attempts(quiz_id,student_id);
create or replace function public.submit_quiz_attempt(p_quiz_id uuid,p_answers jsonb)
returns table(attempt_id uuid,score numeric,total_marks numeric)
language plpgsql security definer set search_path=public as $$
declare sid uuid; qcount integer; earned numeric; possible numeric; new_attempt uuid;
begin
 select s.id into sid from public.students s where s.auth_user_id=auth.uid();
 if sid is null then raise exception 'Student account is not linked.'; end if;
 if coalesce(jsonb_typeof(p_answers),'')<>'object' then raise exception 'Answers must be an object.'; end if;
 if not exists(select 1 from public.quizzes q where q.id=p_quiz_id and q.published=true
   and (q.grade is null or q.grade=(select grade from public.students where id=sid))
   and (q.opens_at is null or q.opens_at<=now()) and (q.closes_at is null or q.closes_at>=now())) then
   raise exception 'Quiz is not available.';
 end if;
 select count(*),coalesce(sum(qq.marks),0),
   coalesce(sum(case when lower(trim(coalesce(p_answers->>qq.id::text,'')))=lower(trim(coalesce(qq.answer_key,''))) then qq.marks else 0 end),0)
 into qcount,possible,earned from public.quiz_questions qq where qq.quiz_id=p_quiz_id;
 if qcount=0 then raise exception 'This quiz has no questions.'; end if;
 if (select count(*) from public.quiz_questions qq where qq.quiz_id=p_quiz_id and not (p_answers ? qq.id::text))>0
 then raise exception 'Please answer every question.'; end if;
 insert into public.quiz_attempts(quiz_id,student_id,answers,score,submitted_at)
 values(p_quiz_id,sid,p_answers,earned,now()) returning id into new_attempt;
 return query select new_attempt,earned,possible;
end; $$;
revoke all on function public.submit_quiz_attempt(uuid,jsonb) from public;
grant execute on function public.submit_quiz_attempt(uuid,jsonb) to authenticated;

drop policy if exists "students read own quiz attempts" on public.quiz_attempts;
create policy "students read own quiz attempts" on public.quiz_attempts for select to authenticated
using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));

-- QR attendance tokens: a teacher creates a short-lived token; a linked student redeems it once.
create table if not exists public.attendance_qr_tokens(
 id uuid primary key default gen_random_uuid(),
 token_hash text not null unique,
 class_date date not null,
 expires_at timestamptz not null,
 used_by uuid references public.students(id) on delete set null,
 used_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.attendance_qr_tokens enable row level security;
drop policy if exists "teacher manage attendance qr tokens" on public.attendance_qr_tokens;
create policy "teacher manage attendance qr tokens" on public.attendance_qr_tokens
for all to authenticated using(public.is_teacher()) with check(public.is_teacher());
delete from public.attendance a using public.attendance b where a.student_id=b.student_id and a.class_date=b.class_date and a.ctid<b.ctid;
create unique index if not exists attendance_one_per_day_idx on public.attendance(student_id,class_date);
create or replace function public.create_attendance_qr_token(p_class_date date default current_date)
returns text language plpgsql security definer set search_path=public as $$
declare raw_token text;
begin
 if not public.is_teacher() then raise exception 'Teacher access required.'; end if;
 raw_token=encode(gen_random_bytes(24),'hex');
 insert into public.attendance_qr_tokens(token_hash,class_date,expires_at,created_by)
 values(encode(digest(raw_token,'sha256'),'hex'),p_class_date,now()+interval '10 minutes',auth.uid());
 return raw_token;
end; $$;
create or replace function public.redeem_attendance_qr_token(p_token text)
returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid; tok public.attendance_qr_tokens%rowtype; new_id uuid;
begin
 select s.id into sid from public.students s where s.auth_user_id=auth.uid();
 if sid is null then raise exception 'Student account is not linked.'; end if;
 update public.attendance_qr_tokens set used_by=sid,used_at=now()
 where token_hash=encode(digest(p_token,'sha256'),'hex') and used_at is null and expires_at>now()
 returning * into tok;
 if tok.id is null then raise exception 'QR code is invalid, expired, or already used.'; end if;
 insert into public.attendance(student_id,class_date,status,note)
 values(sid,tok.class_date,'Present','Verified QR attendance')
 on conflict(student_id,class_date) do update set status='Present',note='Verified QR attendance'
 returning id into new_id;
 return new_id;
end; $$;
revoke all on function public.create_attendance_qr_token(date) from public;
revoke all on function public.redeem_attendance_qr_token(text) from public;
grant execute on function public.create_attendance_qr_token(date) to authenticated;
grant execute on function public.redeem_attendance_qr_token(text) to authenticated;

-- Private student documents. Put the student UUID in the first folder segment.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('student-private','student-private',false,20971520,array['application/pdf','image/jpeg','image/png','video/mp4'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "teacher manage private student files" on storage.objects;
create policy "teacher manage private student files" on storage.objects for all to authenticated
using(bucket_id='student-private' and public.is_teacher())
with check(bucket_id='student-private' and public.is_teacher());
drop policy if exists "students read own private files" on storage.objects;
create policy "students read own private files" on storage.objects for select to authenticated
using(bucket_id='student-private' and exists(
 select 1 from public.students s where s.id::text=(storage.foldername(name))[1] and s.auth_user_id=auth.uid()
));
drop policy if exists "parents read linked private files" on storage.objects;
create policy "parents read linked private files" on storage.objects for select to authenticated
using(bucket_id='student-private' and exists(
 select 1 from public.guardian_students g where g.student_id::text=(storage.foldername(name))[1] and g.guardian_user_id=auth.uid()
));

-- Minimal audit trail: log row changes without copying sensitive row contents.
create or replace function public.write_audit_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare rid uuid; act text;
begin
 if tg_op='DELETE' then rid=old.id; else rid=new.id; end if;
 act=lower(tg_op);
 insert into public.audit_logs(actor_user_id,action,entity,entity_id,details)
 values(auth.uid(),act,tg_table_name,rid,jsonb_build_object('source','database_trigger'));
 if tg_op='DELETE' then return old; else return new; end if;
end; $$;
drop trigger if exists audit_students_changes on public.students;
create trigger audit_students_changes after insert or update or delete on public.students
for each row execute function public.write_audit_event();
drop trigger if exists audit_payments_changes on public.payments;
create trigger audit_payments_changes after insert or update or delete on public.payments
for each row execute function public.write_audit_event();
drop trigger if exists audit_attendance_changes on public.attendance;
create trigger audit_attendance_changes after insert or update or delete on public.attendance
for each row execute function public.write_audit_event();

-- Keep audit logs immutable to browser clients; teacher access is read-only.
drop policy if exists "teacher manage audit_logs" on public.audit_logs;
drop policy if exists "teacher read audit logs" on public.audit_logs;
create policy "teacher read audit logs" on public.audit_logs for select to authenticated using(public.is_teacher());
