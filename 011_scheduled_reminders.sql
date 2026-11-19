-- Opt-in preferences and deduplicated scheduled class-fee reminders.
alter table public.students add column if not exists parent_email text;
alter table public.students add column if not exists email_opt_in boolean not null default false;
alter table public.students add column if not exists sms_opt_in boolean not null default false;
alter table public.students add column if not exists whatsapp_opt_in boolean not null default false;
alter table public.students add column if not exists consent_source text;
alter table public.students add column if not exists notification_consent_recorded_at timestamptz;

create table if not exists public.reminder_logs(
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.invoices(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 channel text not null check(channel in ('email','sms','whatsapp')),
 reminder_date date not null default current_date,
 status text not null default 'pending' check(status in ('pending','sent','failed','skipped')),
 error_message text,
 provider_message_id text,
 created_at timestamptz not null default now(),
 unique(invoice_id,channel,reminder_date)
);

alter table public.reminder_logs enable row level security;
drop policy if exists "teacher read reminder logs" on public.reminder_logs;
create policy "teacher read reminder logs" on public.reminder_logs
 for select to authenticated using(public.is_teacher());

create or replace function public.record_student_notification_consent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
 if coalesce(new.email_opt_in,false)
    or coalesce(new.sms_opt_in,false)
    or coalesce(new.whatsapp_opt_in,false) then

  if length(trim(coalesce(new.consent_source,''))) = 0 then
   raise exception 'Record the source of parent notification consent before enabling reminders.';
  end if;

  if new.email_opt_in and length(trim(coalesce(new.parent_email,''))) = 0 then
   raise exception 'Parent email is required for email reminders.';
  end if;

  if (new.sms_opt_in or new.whatsapp_opt_in)
     and coalesce(new.parent_phone,'') !~ '^\+[1-9][0-9]{7,14}$' then
   raise exception 'Use an international +countrycode phone number for SMS/WhatsApp reminders.';
  end if;

  if tg_op = 'INSERT' then
   new.notification_consent_recorded_at = now();
  elsif new.email_opt_in is distinct from old.email_opt_in
     or new.sms_opt_in is distinct from old.sms_opt_in
     or new.whatsapp_opt_in is distinct from old.whatsapp_opt_in
     or new.consent_source is distinct from old.consent_source then
   new.notification_consent_recorded_at = now();
  end if;
 else
  new.notification_consent_recorded_at = null;
 end if;

 return new;
end;
$$;

drop trigger if exists student_notification_consent_audit on public.students;
create trigger student_notification_consent_audit
before insert or update on public.students
for each row execute function public.record_student_notification_consent();
