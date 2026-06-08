import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMERGENCY_LOAN_RATE = 0.12;
const EMERGENCY_LOAN_TERM_MONTHS = 1;
const EMERGENCY_LOAN_MIN_AMOUNT = 5000;
const EMERGENCY_LOAN_MAX_AMOUNT = 10000;
const CONVENTIONAL_LOAN_RATE = 0.10;

type LoanType = "conventional" | "emergency";

const normalizeLoanType = (loanType: unknown): LoanType | null => {
  const normalized = String(loanType || "").trim().toLowerCase();

  if (normalized === "regular" || normalized === "conventional") {
    return "conventional";
  }

  if (normalized === "emergency") {
    return "emergency";
  }

  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resendKey = Deno.env.get("RESEND_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    const body = await req.json();

    const personal = body.personalInfo;
    const employment = body.employmentInfo;
    const loanInfo = body.loanInfo;
    const financial = body.financialInfo || {};
    const internal_user_id = body.user_id;

    if (!personal || !employment || !loanInfo || !internal_user_id) {
      return new Response(
        JSON.stringify({ error: "Invalid payload structure" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Incoming Payload:", JSON.stringify(body, null, 2));

    /*
    CLEAN INPUTS
    */

    const cleanLoanAmount = Number(
      String(loanInfo.loanAmount || "").replace(/[^0-9.]/g, "")
    );

    if (cleanLoanAmount < 5000) {
      return new Response(
        JSON.stringify({ error: "Minimum loan amount is PHP 5,000" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loanTermMonths = parseInt(
      String(loanInfo.loanTerm || "").replace(/[^0-9]/g, "")
    );

    const email = (personal.email || "").toLowerCase().trim();
    const cleanPhone = (personal.phone || "").replace(/[^\d+]/g, "");

    const cleanIncome = financial.monthly_income
      ? Number(financial.monthly_income)
      : null;

    const cleanExpense = financial.monthly_expense
      ? Number(financial.monthly_expense)
      : null;

    const bankName = financial.bank_name || null;
    const bankAccount = financial.bank_account || null;
    const paySchedule = financial.pay_schedule || null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /*
    DERIVE LOAN TYPE
    */

    const { data: activeLoans, error: activeLoansError } = await supabase
      .from("user_loans_summary")
      .select("loan_type")
      .eq("internal_user_id", internal_user_id)
      .ilike("status", "active");

    if (activeLoansError) {
      console.error(activeLoansError);
      return new Response(
        JSON.stringify({ error: "Unable to verify active loans" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activeLoanTypes = new Set(
      (activeLoans || [])
        .map((loan) => normalizeLoanType(loan.loan_type))
        .filter((loanType): loanType is LoanType => Boolean(loanType))
    );

    const derivedLoanType: LoanType = activeLoanTypes.has("emergency")
      ? "conventional"
      : activeLoanTypes.has("conventional")
        ? "emergency"
        : "conventional";

    const interestRate = derivedLoanType === "emergency"
      ? EMERGENCY_LOAN_RATE
      : CONVENTIONAL_LOAN_RATE;

    if (
      derivedLoanType === "emergency" &&
      (
        loanTermMonths !== EMERGENCY_LOAN_TERM_MONTHS ||
        cleanLoanAmount < EMERGENCY_LOAN_MIN_AMOUNT ||
        cleanLoanAmount > EMERGENCY_LOAN_MAX_AMOUNT
      )
    ) {
      return new Response(
        JSON.stringify({
          error: "Emergency loans must be 1 month and between PHP 5,000 and PHP 10,000",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    /*
    GENERATE APPLICATION ID
    */

    const applicationUUID = crypto.randomUUID();

    const { data: newId, error: idError } =
      await supabase.rpc("get_next_app_id");

    if (idError) {
      console.error(idError);
      return new Response(
        JSON.stringify({ error: idError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const app_id = newId;

    /*
    BUILD INSERT DATA
    */

    const insertData = {
      id: applicationUUID,
      app_id: app_id,
      internal_user_id: internal_user_id,

      first_name: personal.firstName,
      middle_name: personal.middleName,
      last_name: personal.lastName,

      email: email,
      phone: cleanPhone,

      address: personal.address,
      dob: personal.dateOfBirth,

      facebook: personal.facebook,
      phil_id: personal.phil_id,

      amount: cleanLoanAmount,
      term: loanTermMonths,
      loan_purpose: loanInfo.loanPurpose,
      loan_type: derivedLoanType,

      status: "Open",

      employer: employment.company,
      employer_phone: employment.employer_phone,
      employer_address: employment.employer_address,

      job_title: employment.position,
      employment_status: employment.employmentStatus,

      years_employed:
        employment.employmentLength !== null
          ? String(employment.employmentLength)
          : null,

      income: cleanIncome,
      expense: cleanExpense,

      bank_name: bankName,
      bank_account: bankAccount,
      pay_schedule: paySchedule,

      promo_code: personal.promoCode,
      referral: personal.referralCode,
      remarks: derivedLoanType === "emergency"
        ? `Emergency loan default rate: ${interestRate * 100}%`
        : null,
    };

    console.log("Insert Data:", JSON.stringify(insertData, null, 2));

    /*
    INSERT APPLICATION
    */

    const { error: insertError } = await supabase
      .from("applications")
      .insert(insertData);

    if (insertError) {
      console.error(insertError);

      return new Response(
        JSON.stringify({
          error: "Failed to submit application: " + insertError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-borrower-skinny`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          application_id: applicationUUID,
          app_id,
        }),
      }
    ).catch(console.error);

    /*
    SEND EMAIL
    */

    if (resend) {
      const emailHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<style>
body{margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#333;}
.container{max-width:600px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);}
.header{background:#12303b;padding:25px 30px;color:#f5c542;}
.content{padding:30px;background:#f4f4f4;}
.highlight{background:#fff7d6;border-left:5px solid #f5c542;padding:18px;margin:25px 0;border-radius:6px;}
.progress{height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;}
.progress-fill{width:33%;background:#f5c542;height:10px;}
.footer{text-align:center;padding:20px;font-size:13px;color:#6b7280;background:#fafafa;}
</style>
</head>

<body>

<div class="container">

<div class="header">
<h2>Cashew</h2>
<p>Make Your Dream Come True!</p>
</div>

<div class="content">

<p>Dear <strong>${personal.firstName}</strong>,</p>

<p>
Thank you for choosing Cashew for your loan application.
We have successfully received your application and are excited to help you achieve your financial goals.
</p>

<div class="highlight">

<p><strong>Application Reference Number:</strong> ${app_id}</p>
<p><strong>Loan Type:</strong> ${derivedLoanType}</p>
<p><strong>Loan Amount:</strong> PHP ${cleanLoanAmount.toLocaleString()}</p>
<p><strong>Loan Term:</strong> ${loanTermMonths} month(s)</p>
<p><strong>Purpose:</strong> ${loanInfo.loanPurpose}</p>
<p><strong>Status:</strong> Submitted - Pending Verification</p>

</div>

<h3>What's Next?</h3>

<ol>
<li>Our team will review your application within a few hours.</li>
<li>You will receive an update on your application status via email.</li>
<li>If approved, your loan will be processed immediately.</li>
</ol>

<p>
<strong>Need Help?</strong><br>
Phone: +63 998 577 1032<br>
Email: support@cashew.ph<br>
Monday - Friday, 9:00 AM - 6:00 PM
</p>

</div>

<div class="footer">
<strong>The Cashew Team</strong><br>
Making dreams come true, one loan at a time.
</div>

</div>

</body>
</html>
`;

      try {
        await resend.emails.send({
          from: "Cashew <noreply@cashew.ph>",
          to: [email],
          cc: "applications@cashew.ph",
          subject: "Cashew Loan Application Received",
          html: emailHTML,
        });
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    /*
    RESPONSE
    */

    return new Response(
      JSON.stringify({
        success: true,
        applicationId: app_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({ error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
