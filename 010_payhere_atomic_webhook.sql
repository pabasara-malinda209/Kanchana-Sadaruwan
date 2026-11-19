-- Atomic, idempotent PayHere callback processing. Call only from trusted server-side code.
alter table public.payment_transactions add column if not exists expires_at timestamptz not null default (now()+interval '30 minutes');
update public.payment_transactions set status='cancelled' where status in ('created','pending') and expires_at<now();
with ranked as (select id,row_number() over(partition by invoice_id order by created_at desc,id desc) as rn from public.payment_transactions where status in ('created','pending'))
update public.payment_transactions p set status='cancelled',updated_at=now() from ranked r where p.id=r.id and r.rn>1;
create unique index if not exists payment_one_active_per_invoice_idx on public.payment_transactions(invoice_id) where status in ('created','pending');
create or replace function public.process_payhere_notification(
 p_order_id text,p_payment_id text,p_amount numeric,p_currency text,p_status_code text
) returns boolean
language plpgsql security definer set search_path=public as $$
declare tx public.payment_transactions%rowtype; new_status text;
begin
 if p_status_code='2' then new_status='success';
 elsif p_status_code='-1' then new_status='cancelled';
 else new_status='failed'; end if;
 select * into tx from public.payment_transactions where order_id=p_order_id for update;
 if tx.id is null then raise exception 'Unknown payment order.'; end if;
 if round(tx.amount,2)<>round(p_amount,2) or tx.currency<>p_currency then raise exception 'Payment amount or currency mismatch.'; end if;
 if tx.status='success' then return false; end if;
 if tx.expires_at<now() then
  if tx.status in ('created','pending') then update public.payment_transactions set status='cancelled',updated_at=now() where id=tx.id; end if;
  raise exception 'Payment order expired. Please create a new checkout.';
 end if;
 update public.payment_transactions set status=new_status,gateway_payment_id=p_payment_id,updated_at=now() where id=tx.id;
 if new_status='success' then
  update public.invoices set status='paid' where id=tx.invoice_id;
  insert into public.payments(student_id,amount,paid_on,month,note)
  values(tx.student_id,tx.amount,current_date,to_char(current_date,'YYYY-MM'),'PayHere payment '||coalesce(p_payment_id,p_order_id));
 end if;
 return true;
end; $$;
revoke all on function public.process_payhere_notification(text,text,numeric,text,text) from public,anon,authenticated;
grant execute on function public.process_payhere_notification(text,text,numeric,text,text) to service_role;
