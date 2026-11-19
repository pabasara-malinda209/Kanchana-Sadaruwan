-- Provider-backed notification delivery log. Provider credentials remain in Netlify environment variables.
create table if not exists public.notification_logs(
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid references auth.users(id) on delete set null,
 channel text not null check(channel in ('email','sms','whatsapp')),
 recipient text not null,
 subject text,
 body_preview text,
 provider_message_id text,
 status text not null check(status in ('sent','failed')),
 error_message text,
 created_at timestamptz not null default now()
);
alter table public.notification_logs enable row level security;
drop policy if exists "teacher read notification logs" on public.notification_logs;
create policy "teacher read notification logs" on public.notification_logs for select to authenticated using(public.is_teacher());

create index if not exists notification_logs_actor_time_idx on public.notification_logs(actor_user_id,created_at desc);
