-- Learners and linked parents can read issued certificates, but cannot create or edit them.
drop policy if exists "students read own certificates" on public.certificates;
create policy "students read own certificates" on public.certificates for select to authenticated
using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
drop policy if exists "parents read linked certificates" on public.certificates;
create policy "parents read linked certificates" on public.certificates for select to authenticated
using(exists(select 1 from public.guardian_students g where g.student_id=certificates.student_id and g.guardian_user_id=auth.uid()));
