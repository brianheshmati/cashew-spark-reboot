# Cashew Loan Agreement — esignatures.com template (v2)

Paste the body below into your esignatures.com template. `{{placeholders}}` are
merge fields populated by `loan_application_submission` when the contract is
created.

## What changed from v1, and why

| # | Problem in v1 | Fix |
|---|---|---|
| 1 | **`Collection method:` was blank.** Nothing in the signed document authorized charging a card. Every automated debit would have been disputable as unauthorized — and you would lose, because the instrument says nothing. | New **Section 4 — Automatic Card Payment Authorization**, naming the exact card, the exact dates, and the exact amounts. |
| 2 | **Three inconsistent dates**: "entered into 2026-09-15", signed 2026-08-26, first payment 2026-09-14 — *before* the stated agreement date. | All dates derive from one source. Agreement date = signature date. Schedule is validated to start on or after it. |
| 3 | **Rate disclosed as "10% monthly"**, but ₱20,000 → 4 × ₱6,000 over 60 days is **7.71% per 15-day period ≈ 495% EIR**. RA 3765 (Truth in Lending) and SEC MC 3 s.2022 require disclosing the effective rate. | New **Section 3 — Disclosure Statement** with EIR, total finance charge, and net proceeds. |
| 4 | **Collection clause reserved the right** to contact "references, guarantors, employers, or known associates" and to use "social media or other public platforms." SEC MC 18 s.2019 prohibits exactly this for lending/financing companies; borrower consent does not cure a prohibited practice. Licenses have been revoked over it. | Replaced with a lawful contact clause limited to the borrower's own contact details. |
| 5 | No statement of the borrower's right to **revoke** the card authorization, or what happens on prepayment. | Sections 4.4 and 5. |

> These are engineering observations on contract text, not legal advice. Have PH
> counsel review items 3 and 4 before this goes live — both carry regulatory
> exposure beyond the contract itself.

## Required merge fields

```
{{borrower_full_name}}        {{loan_agreement_number}}
{{borrower_address}}          {{principal_amount}}          e.g. 20,000.00
{{agreement_date}}            {{total_repayable}}           e.g. 24,000.00
{{card_brand}}                {{finance_charge}}            total_repayable - principal
{{card_last4}}                {{eir_annual}}                e.g. 495
{{schedule_rows}}             {{monthly_cost_rate}}         e.g. 10
{{first_due_date}}            {{periodic_rate}}             e.g. 7.71
{{final_due_date}}            {{installment_count}}
{{loan_purpose}}              {{disbursement_method}}
```

---

# CASHEW LOAN AGREEMENT

**Agreement No.** {{loan_agreement_number}}

This Loan Agreement ("Agreement") is entered into on **{{agreement_date}}** by and between:

**Lender:** Cashew Solutions ("Lender")
**Borrower:** {{borrower_full_name}}, residing at {{borrower_address}} ("Borrower")

---

## 1. Loan Particulars

| | |
|---|---|
| Principal amount (released to Borrower) | ₱{{principal_amount}} |
| Total amount repayable | ₱{{total_repayable}} |
| Total finance charge | ₱{{finance_charge}} |
| Number of installments | {{installment_count}} |
| First payment due | {{first_due_date}} |
| Final payment due | {{final_due_date}} |
| Loan purpose | {{loan_purpose}} |
| Disbursement method | {{disbursement_method}} |

## 2. Repayment Schedule

The Borrower shall repay the loan in the following installments:

| # | Due date | Amount |
|---|---|---|
{{schedule_rows}}
| | **Total** | **₱{{total_repayable}}** |

## 3. Disclosure Statement
*(Required under RA 3765, the Truth in Lending Act, and SEC MC 3 s.2022)*

| | |
|---|---|
| Net proceeds received by Borrower | ₱{{principal_amount}} |
| Total finance charge | ₱{{finance_charge}} |
| Nominal cost rate | {{monthly_cost_rate}}% per month |
| Rate per payment period | {{periodic_rate}}% |
| **Effective Interest Rate (annualized)** | **{{eir_annual}}%** |

The Effective Interest Rate is higher than the nominal monthly rate because the
principal is repaid in installments over the term, so the Borrower does not have
use of the full principal for the entire period. The Borrower acknowledges
having read and understood this disclosure before signing.

## 4. Automatic Card Payment Authorization

**4.1 Authorization.** The Borrower irrevocably authorizes the Lender, and its
payment processor Stripe, to automatically charge the payment card ending in
**{{card_last4}}** ({{card_brand}}) (the "Authorized Card") for each installment
set out in Section 2, on or after its due date, in the amounts stated.

**4.2 Scope.** This authorization covers (a) the scheduled installments in
Section 2; (b) any late payment charges properly accrued under Section 6; and
(c) re-attempts of a declined installment, up to three (3) attempts per
installment. It authorizes no other charge.

**4.3 Notice.** The Lender will email the Borrower at least three (3) days
before each scheduled charge, stating the amount and date. A receipt will be
emailed after each successful charge.

**4.4 Changing or revoking the Authorized Card.** The Borrower may replace the
Authorized Card at any time through the Cashew dashboard. The Borrower may
revoke this authorization by written notice to {{support_email}} at least five
(5) business days before the next scheduled charge. **Revoking the card
authorization does not cancel, reduce, or suspend the underlying debt**, which
remains payable in full on the dates in Section 2 by another method agreed with
the Lender.

**4.5 Card validity.** The Borrower confirms they are the authorized holder of
the Authorized Card and will keep it valid and funded through {{final_due_date}}.

**4.6 Disputed charges.** If the Borrower believes a charge was made in error,
they will contact the Lender at {{support_email}} before initiating a card
chargeback, so the matter can be resolved directly.

## 5. Prepayment

The Borrower may repay the outstanding balance in whole or in part at any time
without penalty. On full prepayment, all remaining scheduled charges under
Section 4 are cancelled and the Authorized Card will not be charged again.

## 6. Late Payment Charges

**6.1** A late payment charge of 0.5% per day accrues on the *overdue
installment amount only* — not on the outstanding principal — from the day after
the due date until that installment is paid.

**6.2** A fixed collection fee of ₱250 applies per installment that remains
unpaid more than five (5) days after its due date.

**6.3** Late charges under 6.1 and 6.2 shall not in aggregate exceed the amount
of the installment to which they relate.

**6.4** The interest rate disclosed in Section 3 is fixed for the term of this
Agreement and will not be increased.

> **Note on 6.1–6.3:** v1 charged 0.5%/day on the *outstanding balance* with no
> cap, plus a discretionary rate increase. That compounds to ~182% p.a. on top of
> an already-495% EIR and is the kind of term the SEC treats as unconscionable.
> The cap and the fixed-rate commitment in 6.4 are deliberate. Confirm the final
> numbers with counsel.

## 7. Default

If any installment remains unpaid more than fifteen (15) days after its due
date, the Lender may declare the entire outstanding balance immediately due and
payable, and may pursue lawful collection remedies including legal action.

## 8. Collection and Communication

If the Borrower fails to pay, the Lender may contact the Borrower using the
contact details the Borrower provided in their loan application — telephone,
SMS, email, or registered mailing address — during reasonable hours.

The Lender will **not**: contact the Borrower's employer, references, relatives,
friends, or any person in the Borrower's contacts regarding this debt, except as
expressly permitted by law; disclose the existence or details of this debt to
any third party except as required by law or to a licensed collection agency or
legal counsel bound by confidentiality; or publish any reference to this debt on
social media or any public platform.

The Lender processes personal data in accordance with RA 10173 (Data Privacy
Act) and its Privacy Policy.

## 9. Borrower Acknowledgment

By signing below, the Borrower acknowledges that they have read and understood:

- the repayment schedule in Section 2 and the total amount repayable;
- the Effective Interest Rate disclosed in Section 3;
- **the authorization in Section 4 permitting automatic charges to the card ending {{card_last4}} on the dates and in the amounts shown in Section 2**;
- the late payment charges in Section 6 and the consequences of default in Section 7.

---

**Borrower signature:** ________________________
{{borrower_full_name}}
Date: {{agreement_date}}
