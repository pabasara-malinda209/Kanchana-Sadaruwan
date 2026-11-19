-- Atomic teacher-managed portal account linking; no service-role key needed in the browser.
create or replace function public.link_portal_account(
 p_email text,p_student_id uuid,p_mode text,p_relationship text default 'Parent'
) returns uuid
language plpgsql security definer set search_path=public,auth as $$
declare target_id uuid; current_role text; existing_user uuid;
begin
 if not public.is_teacher() then raise exception 'Teacher permission required.'; end if;
 if p_mode not in ('student','parent') or length(trim(coalesce(p_email,'')))<5 then raise exception 'Invalid account details.'; end if;
 select id into target_id from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target_id is null then raise exception 'No registered account found for this email. Ask the user to sign up first.'; end if;
 if target_id=auth.uid() then raise exception 'You cannot link your own administrator account.'; end if;
 select role into current_role from public.profiles where id=target_id for update;
 if current_role in ('teacher','admin') then raise exception 'Administrator accounts cannot be linked as learners or parents.'; end if;
 if not exists(select 1 from public.students where id=p_student_id) then raise exception 'Student record not found.'; end if;
 if p_mode='student' then
  select auth_user_id into existing_user from public.students where id=p_student_id for update;
  if existing_user is not null and existing_user<>target_id then raise exception 'This student already has a different login linked.'; end if;
  delete from public.guardian_students where guardian_user_id=target_id;
  update public.students set auth_user_id=target_id where id=p_student_id;
  insert into public.profiles(id,role,student_id) values(target_id,'student',p_student_id)
  on conflict(id) do update set role='student',student_id=excluded.student_id;
 else
  update public.students set auth_user_id=null where auth_user_id=target_id;
  insert into public.profiles(id,role,student_id) values(target_id,'parent',null)
  on conflict(id) do update set role='parent',student_id=null;
  insert into public.guardian_students(guardian_user_id,student_id,relationship)
  values(target_id,p_student_id,left(coalesce(nullif(trim(p_relationship),''),'Parent'),40))
  on conflict(guardian_user_id,student_id) do update set relationship=excluded.relationship;
 end if;
 return target_id;
end; $$;
revoke all on function public.link_portal_account(text,uuid,text,text) from public;
grant execute on function public.link_portal_account(text,uuid,text,text) to authenticated;
