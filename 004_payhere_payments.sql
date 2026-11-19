-- PayHere transaction ledger. Requires Netlify environment variables; never store gateway secrets in browser code.
create table if not exists public.payment_transactions(
 id uuid primary key default gen_random_uuid(),
 invoice_id uuid not null references public.invoices(id) on delete restrict,
 student_id uuid not null references public.students(id) on delete restrict,
 gateway text not null default 'payhere',
 order_id text not null unique,
 gateway_payment_id text,
 amount numeric(12,2) not null check(amount>0),
 currency text not null default 'LKR',
 status text not null default 'created' check(status in ('created','pending','success','failed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.payment_transactions enable row level security;
drop policy if exists "teacher read payment transactions" on public.payment_transactions;
create policy "teacher read payment transactions" on public.payment_transactions for select to authenticated using(public.is_teacher());
drop policy if exists "students read own payment transactions" on public.payment_transactions;
create policy "students read own payment transactions" on public.payment_transactions for select to authenticated
using(exists(select 1 from public.students s where s.id=student_id and s.auth_user_id=auth.uid()));
drop policy if exists "parents read linked payment transactions" on public.payment_transactions;
create policy "parents read linked payment transactions" on public.payment_transactions for select to authenticated
using(exists(select 1 from public.guardian_students g where g.student_id=payment_transactions.student_id and g.guardian_user_id=auth.uid()));
create index if not exists payment_transactions_invoice_idx on public.payment_transactions(invoice_id,created_at desc);
