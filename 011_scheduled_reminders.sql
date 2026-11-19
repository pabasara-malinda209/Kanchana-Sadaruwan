-- Opt-in preferences and deduplicated scheduled class-fee reminders.
alter table public.students add column if not exists parent_email text;
alter table public.students add column if not exists email_opt_in boolean not null default false;
alter table public.students add column if not exists sms_opt_in boolean not null default false;
alter table public.students add column if not exists whatsapp_opt_in boolean not null default false;
create table if not exists public.reminder_logs(
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.invoices(id) on delete cascade,
 student_id uuid not null references public.students(id) on delete cascade,
 channel text not null check(channel in ('email','sms','whatsapp')),
 reminder_date date not null default current_date,
 status text not null default 'pending' check(status in ('pending','sent','failed','skipped')),
 error_message text,
 created_at timestamptz not null default now(),
 unique(invoice_id,channel,reminder_date)
);
alter table public.reminder_logs enable row level security;
drop policy if exists "teacher read reminder logs" on public.reminder_logs;
create policy "teacher read reminder logs" on public.reminder_logs for select to authenticated using(public.is_teacher());
