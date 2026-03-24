create view public.user_loans_summary as
with
  schedule_totals as (
    select
      ps.loan_id,
      min(ps.date) as start_date,
      max(ps.date) as end_date,
      sum(ps.amount) as total_scheduled,
      sum(COALESCE(ps.pay_amount, 0::numeric)) as total_paid
    from
      payment_schedules ps
    group by
      ps.loan_id
  )
select
  l.created_at,
  l.id as loan_id,
  l.internal_user_id,
  up.email,
  l.application_id,
  l.amount as principal_amount,
  l.amount as loan_amount,
  'Regular'::text as loan_type,
  case
    when GREATEST(st.total_scheduled - st.total_paid, 0::numeric) <= 0::numeric then 'paid_off'::text
    else 'active'::text
  end as status,
  l.term as term_months,
  l.interest_rate,
  st.start_date,
  st.end_date,
  GREATEST(st.total_scheduled - st.total_paid, 0::numeric) as current_balance,
  GREATEST(st.total_scheduled - st.total_paid, 0::numeric) as total_balance,
  case
    when l.term > 0::numeric then round(st.total_scheduled / l.term, 2)
    else 0::numeric
  end as monthly_payment
from
  loans l
  join schedule_totals st on st.loan_id = l.id
  left join "userProfiles" up on up.internal_user_id = l.internal_user_id;

create view public.outstanding_payment_schedules as
with
  loan_balance as (
    select
      ps.loan_id,
      sum(ps.amount) as total_scheduled,
      COALESCE(sum(p.amount), 0::numeric) as total_paid
    from
      payment_schedules ps
      left join payments p on p.loan_id = ps.loan_id
    group by
      ps.loan_id
  ),
  schedule_payments as (
    select
      ps.id as payment_schedule_id,
      ps.loan_id,
      ps.date,
      ps.amount as scheduled_amount,
      COALESCE(sum(p.amount), 0::numeric) as amount_paid
    from
      payment_schedules ps
      left join payments p on p.payment_schedule_id = ps.id
    group by
      ps.id,
      ps.loan_id,
      ps.date,
      ps.amount
  )
select
  sp.payment_schedule_id,
  sp.loan_id,
  l.internal_user_id,
  sp.date,
  sp.scheduled_amount,
  sp.amount_paid,
  sp.scheduled_amount - sp.amount_paid as remaining_amount
from
  schedule_payments sp
  join loan_balance lb on lb.loan_id = sp.loan_id
  join loans l on l.id = sp.loan_id
where
  lb.total_scheduled > lb.total_paid
  and sp.scheduled_amount > sp.amount_paid
order by
  l.internal_user_id,
  sp.date;

  create view public.past_due_payments as
select
  s.id as payment_id,
  s.loan_id as schedule_loan_id,
  s.amount - COALESCE(t.total_payment, 0::numeric) as remainder,
  s.amount,
  COALESCE(t.total_payment, 0::numeric) as total_payment,
  s.date as due_date,
  s.status,
  l.amount as loan_amount,
  l.id as loan_id,
  l.start_date,
  l.term,
  l.interest_rate,
  b.borrower_id,
  b.first_name,
  b.last_name,
  b.phone,
  b.email,
  b.client_id,
  b.promo_code
from
  payment_schedules s
  left join loans l on s.loan_id = l.id
  left join borrower_profile_view b on l.borrower_id = b.borrower_id::numeric
  left join (
    select
      payments.payment_schedule_id,
      sum(payments.amount) as total_payment
    from
      payments
    group by
      payments.payment_schedule_id
  ) t on t.payment_schedule_id = s.id
where
  (CURRENT_DATE - s.date) > 0
  and (s.amount - COALESCE(t.total_payment, 0::numeric)) > 0::numeric
  and (
    (
      upper(s.status) = any (array['ACTIVE'::text, 'PARTIAL'::text, ''::text])
    )
    or s.status is null
  );

  create view public.payment_schedules_view as
select
  s.id,
  s.loan_id,
  s.amount,
  t.total_payment,
  s.date,
  s.modified_at,
  s.status,
  u.first_name,
  u.middle_name,
  u.last_name
from
  payment_schedules s
  join (
    select
      loans.id as loan_id,
      a.internal_user_id,
      a.first_name,
      a.middle_name,
      a.last_name
    from
      "userProfiles" a
      join loans on a.internal_user_id = loans.internal_user_id
  ) u on s.loan_id = u.loan_id
  left join (
    select
      payments.payment_schedule_id,
      sum(payments.amount) as total_payment
    from
      payments
    group by
      payments.payment_schedule_id
  ) t on t.payment_schedule_id = s.id;

  create view public.loan_transactions_1 as
with
  schedule_base as (
    select
      ps.id as schedule_id,
      ps.loan_id,
      ps.date as due_date,
      ps.amount as scheduled_amount,
      COALESCE(ps.pay_amount, 0::numeric) as paid_amount,
      ps.amount - COALESCE(ps.pay_amount, 0::numeric) as remaining_amount,
      case
        when COALESCE(ps.pay_amount, 0::numeric) >= ps.amount then 'paid'::text
        when COALESCE(ps.pay_amount, 0::numeric) > 0::numeric then 'partial'::text
        else 'outstanding'::text
      end as schedule_status,
      case
        when ps.date < CURRENT_DATE
        and COALESCE(ps.pay_amount, 0::numeric) < ps.amount then true
        else false
      end as is_overdue,
      case
        when ps.date < CURRENT_DATE
        and COALESCE(ps.pay_amount, 0::numeric) < ps.amount then CURRENT_DATE - ps.date
        else 0
      end as days_overdue
    from
      payment_schedules ps
  ),
  loan_totals as (
    select
      payment_schedules.loan_id,
      sum(payment_schedules.amount) as total_repayable,
      sum(
        COALESCE(payment_schedules.pay_amount, 0::numeric)
      ) as total_paid
    from
      payment_schedules
    group by
      payment_schedules.loan_id
  ),
  loan_balance_calc as (
    select
      loan_totals.loan_id,
      loan_totals.total_repayable,
      loan_totals.total_paid,
      GREATEST(
        loan_totals.total_repayable - loan_totals.total_paid,
        0::numeric
      ) as current_balance,
      (
        loan_totals.total_repayable - loan_totals.total_paid
      ) <= 0::numeric as is_fully_paid
    from
      loan_totals
  ),
  next_due_calc as (
    select
      schedule_base.loan_id,
      min(schedule_base.due_date) as next_due_date
    from
      schedule_base
    where
      schedule_base.schedule_status = any (array['outstanding'::text, 'partial'::text])
    group by
      schedule_base.loan_id
  ),
  installment_tx as (
    select
      sb.loan_id,
      sb.schedule_id,
      null::uuid as payment_id,
      sb.due_date as date,
      sb.scheduled_amount as amount,
      'Installment'::text as type,
      sb.schedule_status as status,
      sb.remaining_amount,
      sb.is_overdue,
      sb.days_overdue,
      1 as sort_order
    from
      schedule_base sb
  ),
  payment_tx as (
    select
      p.loan_id,
      p.payment_schedule_id as schedule_id,
      p.id as payment_id,
      COALESCE(p.pay_date, p.date, p.created_at::date) as date,
      p.amount,
      'Payment'::text as type,
      COALESCE(p.status, 'completed'::text) as status,
      0::numeric as remaining_amount,
      false as is_overdue,
      0 as days_overdue,
      2 as sort_order
    from
      payments p
  ),
  combined as (
    select
      installment_tx.loan_id,
      installment_tx.schedule_id,
      installment_tx.payment_id,
      installment_tx.date,
      installment_tx.amount,
      installment_tx.type,
      installment_tx.status,
      installment_tx.remaining_amount,
      installment_tx.is_overdue,
      installment_tx.days_overdue,
      installment_tx.sort_order
    from
      installment_tx
    union all
    select
      payment_tx.loan_id,
      payment_tx.schedule_id,
      payment_tx.payment_id,
      payment_tx.date,
      payment_tx.amount,
      payment_tx.type,
      payment_tx.status,
      payment_tx.remaining_amount,
      payment_tx.is_overdue,
      payment_tx.days_overdue,
      payment_tx.sort_order
    from
      payment_tx
  ),
  ordered as (
    select
      combined.loan_id,
      combined.schedule_id,
      combined.payment_id,
      combined.date,
      combined.amount,
      combined.type,
      combined.status,
      combined.remaining_amount,
      combined.is_overdue,
      combined.days_overdue,
      combined.sort_order
    from
      combined
    order by
      combined.loan_id,
      combined.date,
      combined.sort_order
  ),
  running_calc as (
    select
      o.loan_id,
      o.schedule_id,
      o.payment_id,
      o.date,
      o.amount,
      o.type,
      o.status,
      o.remaining_amount,
      o.is_overdue,
      o.days_overdue,
      o.sort_order,
      lb_1.total_repayable,
      sum(
        case
          when o.type = 'Payment'::text then o.amount
          else 0::numeric
        end
      ) over (
        partition by
          o.loan_id
        order by
          o.date,
          o.sort_order rows between UNBOUNDED PRECEDING
          and CURRENT row
      ) as cumulative_paid
    from
      ordered o
      join loan_balance_calc lb_1 on lb_1.loan_id = o.loan_id
  )
select
  row_number() over (
    order by
      rc.loan_id,
      rc.date desc,
      rc.sort_order desc
  ) as id,
  rc.loan_id,
  l.internal_user_id,
  l.amount as loan_amount,
  l.term as term_months,
  l.interest_rate,
  l.status as loan_status,
  lb.total_repayable,
  lb.total_paid,
  lb.current_balance,
  lb.is_fully_paid,
  nd.next_due_date,
  rc.type = 'Installment'::text
  and rc.date = nd.next_due_date as is_next_due,
  rc.schedule_id,
  rc.payment_id,
  rc.date,
  rc.amount,
  rc.remaining_amount,
  rc.type,
  rc.status,
  rc.is_overdue,
  rc.days_overdue,
  GREATEST(
    rc.total_repayable - rc.cumulative_paid,
    0::numeric
  ) as running_balance
from
  running_calc rc
  join loans l on l.id = rc.loan_id
  left join loan_balance_calc lb on lb.loan_id = rc.loan_id
  left join next_due_calc nd on nd.loan_id = rc.loan_id
order by
  rc.loan_id,
  rc.date desc,
  rc.sort_order desc;

  create view public.loan_transactions as
with
  deposits as (
    select
      l_1.id as loan_id,
      min(ps.date) as date,
      l_1.amount,
      'Deposit'::text as type,
      l_1.status
    from
      loans l_1
      join payment_schedules ps on ps.loan_id = l_1.id
    group by
      l_1.id,
      l_1.amount,
      l_1.status
  ),
  payments_tx as (
    select
      p.loan_id,
      p.created_at::date as date,
      p.amount,
      'Payment'::text as type,
      'completed'::text as status
    from
      payments p
  )
select
  row_number() over (
    order by
      t.date desc,
      t.type
  ) as id,
  t.loan_id,
  l.internal_user_id,
  t.date,
  t.amount,
  t.type,
  t.status
from
  (
    select
      deposits.loan_id,
      deposits.date,
      deposits.amount,
      deposits.type,
      deposits.status
    from
      deposits
    union all
    select
      payments_tx.loan_id,
      payments_tx.date,
      payments_tx.amount,
      payments_tx.type,
      payments_tx.status
    from
      payments_tx
  ) t
  join loans l on l.id = t.loan_id
order by
  t.date desc;


 create view public.borrowers_loans_view as
select
  b.id,
  b.created_at::date as date_joined,
  ''::text as credit_score,
  b.first_name,
  b.last_name,
  b.email,
  b.phone,
  b.address,
  br.referrer,
  br.loan_officer,
  b.whatsapp,
  b.instagram,
  b.facebook,
  l.id as loan_id,
  l.amount,
  l.start_date,
  l.end_date,
  l.term,
  l.status,
  case
    when (
      l.amount * (1::numeric + l.interest_rate * l.term) - COALESCE(t.total_payment, 0::numeric)
    ) > 10::numeric then 'In progress'::text
    else 'Paid'::text
  end as loan_status,
  l.interest_rate,
  l.total_interest,
  t.total_payment,
  l.stage,
  l.team_member_id,
  br.client_id
from
  loans l
  join "userProfiles" b on b.internal_user_id = l.internal_user_id
  left join borrowers br on l.internal_user_id = br.internal_user_id
  left join (
    select
      payments.loan_id,
      sum(payments.amount) as total_payment
    from
      payments
    group by
      payments.loan_id
  ) t on t.loan_id = l.id
where
  l.id is not null;


  create view public.borrower_profile_view as
select
  b.id as borrower_id,
  b.internal_user_id,
  b.created_at::date as date_joined,
  b.payment_methods,
  b.referrer,
  b.loan_officer,
  b.user_name,
  u.first_name,
  u.last_name,
  u.middle_name,
  u.email,
  u.phone,
  u.address,
  u.role,
  u.photo_url,
  u.facebook,
  u.instagram,
  u.whatsapp,
  b.client_id,
  u.employer,
  u.employer_phone,
  u.employer_address,
  u.phil_id,
  u.dob as "DOB",
  u.promo_code,
  u.bank_name,
  u.bank_account,
  u.income,
  u.expense,
  0 as loan_amount,
  0 as term,
  ''::text as loan_purpose
from
  borrowers b
  left join "userProfiles" u on b.internal_user_id = u.internal_user_id;



  create view public.borrower_loan_view as
select
  b.borrower_id,
  b.internal_user_id,
  b.date_joined,
  ''::text as credit_score,
  b.first_name,
  b.last_name,
  b.email,
  b.phone,
  b.address,
  b.referrer,
  b.loan_officer,
  b.whatsapp,
  b.instagram,
  b.photo_url,
  b.facebook,
  b.payment_methods,
  l.id as loan_id,
  l.amount,
  t.total_payment,
  l.start_date,
  l.end_date,
  l.term,
  l.status,
  l.interest_rate,
  (
    l.amount * (
      1::numeric + l.term * l.interest_rate / 100::numeric
    )
  )::integer as total_interest,
  (
    l.amount * (
      1::numeric + l.term * l.interest_rate / 100::numeric
    )
  )::integer::numeric - COALESCE(t.total_payment, 0::numeric) as remainder,
  l.stage,
  l.team_member_id
from
  borrower_profile_view b
  left join loans l on b.internal_user_id = l.internal_user_id
  left join (
    select
      payments.loan_id,
      sum(COALESCE(NULLIF(payments.amount, 0::numeric))) as total_payment
    from
      payments
    group by
      payments.loan_id
  ) t on t.loan_id = l.id
where
  upper(b.role) <> 'LOAN OFFICER'::text
  and (
    (
      upper(l.status) = any (array['ACTIVE'::text, ''::text])
    )
    or l.status is null
  );


  create view public.applications_unconverted as
select
  a.id,
  a.created_at,
  a.first_name,
  a.last_name,
  a.middle_name,
  a.amount,
  a.term,
  a.address,
  a.phone,
  a.email,
  a.loan_purpose,
  a.facebook,
  a.signature,
  a.phil_id,
  a.status,
  a.photo,
  a.employer,
  a.notes,
  a.promo_code,
  a.employer_phone,
  a.employer_address,
  a.bank_name,
  a.income,
  a.expense,
  a.bank_account,
  a.dob,
  a.app_id,
  a.internal_user_id,
  a.remarks,
  a.employment_status,
  a.job_title,
  a.years_employed,
  a.referral,
  a.verify_code,
  a.is_verified,
  a.verified_at,
  a.loan_confirmed,
  a.confirmed_at,
  a.loan_status,
  a.last_reminder_sent,
  a.loan_type,
  a.pay_schedule
from
  applications a
where
  lower(COALESCE(a.status, ''::text)) <> all (
    array[
      'closed'::text,
      'duplicate'::text,
      'inactive'::text
    ]
  );   