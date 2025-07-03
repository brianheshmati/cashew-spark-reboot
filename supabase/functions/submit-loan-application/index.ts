import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoanApplicationData {
  personalInfo: {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    address: string;
  };
  employmentInfo: {
    employmentStatus: string;
    company: string;
    position: string;
    monthlyIncome: string;
    employmentLength: string;
  };
  loanInfo: {
    loanAmount: string;
    loanPurpose: string;
    loanTerm: string;
    promoCode: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const applicationData: LoanApplicationData = await req.json();

    // Clean and validate data
    const cleanLoanAmount = parseFloat(applicationData.loanInfo.loanAmount.replace(/[^0-9.]/g, ''));
    const cleanMonthlyIncome = parseFloat(applicationData.employmentInfo.monthlyIncome.replace(/[^0-9.]/g, ''));
    
    // Validate minimum loan amount
    if (cleanLoanAmount < 5000) {
      return new Response(
        JSON.stringify({ error: 'Minimum loan amount is PHP 5,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number (remove any non-digits except +)
    const cleanPhone = applicationData.personalInfo.phone.replace(/[^\d+]/g, '');
    
    // Clean and validate email
    const email = applicationData.personalInfo.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate application ID
    const applicationId = crypto.randomUUID();

    // Parse loan term to get months
    const loanTermMonths = parseInt(applicationData.loanInfo.loanTerm.replace(/[^0-9]/g, ''));

    // First, try to sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: crypto.randomUUID(), // Generate random password since we'll use email verification
      options: {
        emailRedirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
        data: {
          first_name: applicationData.personalInfo.firstName,
          last_name: applicationData.personalInfo.lastName,
          application_id: applicationId
        }
      }
    });

    if (authError && authError.message !== 'User already registered') {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create account: ' + authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert loan application data
    const { error: insertError } = await supabase
      .from('loan_applications')
      .insert({
        application_id: applicationId,
        first_name: applicationData.personalInfo.firstName.trim(),
        last_name: applicationData.personalInfo.lastName.trim(),
        email: email,
        phone: cleanPhone,
        address: applicationData.personalInfo.address.trim(),
        loan_amount: cleanLoanAmount,
        loan_term: loanTermMonths,
        loan_purpose: applicationData.loanInfo.loanPurpose,
        monthly_income: cleanMonthlyIncome,
        years_employed: applicationData.employmentInfo.employmentLength === 'less-than-1' ? 0.5 : 
                       applicationData.employmentInfo.employmentLength === '1-2' ? 1.5 : 
                       applicationData.employmentInfo.employmentLength === '3-5' ? 4 : 5,
        employer_name: applicationData.employmentInfo.company.trim() || 'Not specified',
        job_title: applicationData.employmentInfo.position.trim() || 'Not specified',
        agreed_to_terms: true,
        status: 'submitted',
        // Required fields for the schema
        city: 'Not specified',
        state: 'Not specified', 
        zip_code: 'Not specified',
        id_image: 'pending',
        signature: 'pending'
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit application: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send confirmation email if Resend is configured
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Cashew Philippines <noreply@cashew.ph>',
          to: [email],
          subject: 'Complete Your Loan Application Registration',
          html: `
            <h1>Welcome to Cashew Philippines!</h1>
            <p>Dear ${applicationData.personalInfo.firstName},</p>
            <p>Thank you for submitting your loan application. To complete your registration, please check your email for a verification link.</p>
            <p><strong>Application Reference:</strong> ${applicationId}</p>
            <p>Once verified, we'll review your application within 24 hours.</p>
            <p>Best regards,<br>The Cashew Philippines Team</p>
          `
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicationId: applicationId,
        message: 'Application submitted successfully. Please check your email to verify your account.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);