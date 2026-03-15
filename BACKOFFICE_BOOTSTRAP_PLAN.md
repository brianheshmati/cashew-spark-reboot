# Cashew Spark Backoffice Bootstrap Plan

This document outlines the first implementation steps for the new repository:

- **Repo:** `https://github.com/brianheshmati/cashew-spark-backoffice.git`
- **Goal:** Build a backoffice app for application review, underwriting, approval/rejection, loan creation, and payment scheduling.

## 1) Recommended stack for the new repo

Use the same proven frontend baseline from this project for rapid delivery:

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Postgres (schema-first workflow)

## 2) Initial module scope (V1)

1. **Application Queue**
   - Filter by status, date, amount, assignee
   - SLA aging columns (e.g., 0-1d, 2-3d, 4d+)

2. **Application Details**
   - Applicant profile
   - Employment and financial snapshot
   - Documents and verification status
   - Timeline and internal remarks

3. **Underwriting Workbench**
   - Risk inputs
   - Affordability snapshot (income, expense)
   - Proposed terms
   - Recommendation (`approve`, `reject`, `manual_review`)

4. **Approval Desk**
   - Final decision with reason codes
   - Maker/checker-compatible flow

5. **Loan Booking + Schedule Generator**
   - Create loan from approved application only
   - Generate and edit payment schedules

6. **Collections/Payments**
   - Post payments
   - Match against schedules
   - Track overdue accounts

## 3) Data model hardening (to apply early)

Use constraints/enums to avoid status drift:

- `applications.status`: `submitted | in_review | underwriting | approved | rejected | withdrawn`
- `loans.status`: `pending_disbursement | active | closed | defaulted | written_off`
- `payment_schedules.status`: `due | paid | partial | overdue | waived`
- `payments.status`: `posted | reversed | failed`

Add strict foreign keys:

- `loans.application_id -> applications.id`
- `payment_schedules.loan_id -> loans.id`
- `payments.loan_id -> loans.id`
- `payments.payment_schedule_id -> payment_schedules.id`

Create `audit_events` table to track all sensitive actions.

## 4) First SQL views to build

1. `vw_application_queue`
2. `vw_underwriting_workbench`
3. `vw_approval_queue`
4. `vw_active_loans`
5. `vw_collection_snapshot`
6. `vw_payment_ledger`

## 5) Suggested execution order

### Phase A: Foundation
- Bootstrap repo with frontend scaffold
- Add Supabase schema migrations for constraints/FKs/audit table
- Seed role-based test users

### Phase B: Workflow
- Build queue and details pages
- Build underwriting and approval actions
- Add immutable event timeline (audit-backed)

### Phase C: Loan operations
- Loan booking from approved applications
- Payment schedule generation and editing
- Payment posting + schedule reconciliation

### Phase D: Controls and reporting
- Overdue and DPD dashboards
- Decision and conversion reports
- Operational exports

## 6) Definition of done for the first milestone

- A reviewer can move an application to underwriting.
- An underwriter can submit recommendation and notes.
- An approver can approve/reject with reason codes.
- Approval creates a bookable path to loan creation.
- Loan creation generates a schedule visible in collections.
- Every action above is visible in audit history.

## 7) Next collaboration step

In the next step, implement SQL migrations in the new repo for:

- status constraints
- relational foreign keys
- `audit_events`
- first 3 operational views:
  - `vw_application_queue`
  - `vw_underwriting_workbench`
  - `vw_active_loans`
