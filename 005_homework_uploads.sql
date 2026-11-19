-- Private assignment uploads and teacher marking workflow.
update storage.buckets set allowed_mime_types=array[
 'application/pdf','image/jpeg','image/png','video/mp4',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] where id='student-private';
drop policy if exists "students upload own private files" on storage.objects;
create policy "students upload own private files" on storage.objects for insert to authenticated
with check(bucket_id='student-private' and exists(
 select 1 from public.students s where s.id::text=(storage.foldername(name))[1] and s.auth_user_id=auth.uid()
));
drop policy if exists "parents read linked submissions" on public.submissions;
create policy "parents read linked submissions" on public.submissions for select to authenticated
using(exists(select 1 from public.guardian_students g where g.student_id=submissions.student_id and g.guardian_user_id=auth.uid()));
drop policy if exists "students submit own work" on public.submissions;
create policy "students submit own work" on public.submissions for insert to authenticated
with check(
 exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid())
 and exists(select 1 from public.assignments a where a.id=assignment_id and a.published=true)
);
