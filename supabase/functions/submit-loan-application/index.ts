import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "npm:resend@2.0.0";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const handler = async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const applicationData = await req.json();
    // Clean and validate data
    const cleanLoanAmount = parseFloat(applicationData.loanInfo.loanAmount.replace(/[^0-9.]/g, ''));
    const cleanMonthlyIncome = parseFloat(applicationData.employmentInfo.monthlyIncome.replace(/[^0-9.]/g, ''));
    const cleanMonthlyExpense = parseFloat(applicationData.employmentInfo.monthlyExpense.replace(/[^0-9.]/g, ''));
    // Validate minimum loan amount
    if (cleanLoanAmount < 5000) {
      return new Response(JSON.stringify({
        error: 'Minimum loan amount is PHP 5,000'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Clean phone number (remove any non-digits except +)
    const cleanPhone = applicationData.personalInfo.phone.replace(/[^\d+]/g, '');
    // Clean and validate email
    const email = applicationData.personalInfo.email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Generate application ID
    const applicationId = crypto.randomUUID();
    console.log('Generated application ID:', applicationId);
    // Parse loan term to get months
    const loanTermMonths = parseInt(applicationData.loanInfo.loanTerm.replace(/[^0-9]/g, ''));
    // First, try to sign up the user
    console.log('Attempting to sign up user with email:', email);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: crypto.randomUUID(),
      options: {
        emailRedirectTo: `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`,
        data: {
          first_name: applicationData.personalInfo.firstName,
          last_name: applicationData.personalInfo.lastName,
          middle_name: applicationData.personalInfo.middleName,
          application_id: applicationId
        }
      }
    });
    console.log('Auth response:', {
      authData: authData?.user?.id,
      authError
    });
    if (authError && authError.message !== 'User already registered') {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({
        error: 'Failed to create account: ' + authError.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get user ID for the applications table
    let userId = authData?.user?.id;
    console.log('User ID from auth:', userId);
    // If user already exists, skip user creation but still process application
    if (authError && authError.message === 'User already registered') {
      console.log('User already exists, proceeding with application');
      // For now, let's use a dummy user ID that we know exists
      // In production, you'd want to implement proper user lookup
      userId = applicationId; // Use application ID as user ID temporarily
    }
    if (!userId) {
      console.error('No user ID available');
      return new Response(JSON.stringify({
        error: 'Failed to get user ID'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Final user ID for application:', userId);
    // Insert loan application data into applications table
    const insertData = {
      id: applicationId,
      first_name: applicationData.personalInfo.firstName,
      middle_name: applicationData.personalInfo.middleName,
      last_name: applicationData.personalInfo.lastName,
      email: applicationData.personalInfo.email,
      phone: cleanPhone,
      //user_id: userId,
      //loan_type: 'personal',
      amount: cleanLoanAmount,
      term: loanTermMonths,
      income: cleanMonthlyIncome,
      expense: cleanMonthlyExpense,
      years_employed: applicationData.employmentInfo.employmentLength === 'less-than-1' ? 0.5 : applicationData.employmentInfo.employmentLength === '1-2' ? 1.5 : applicationData.employmentInfo.employmentLength === '3-5' ? 4 : 5,
      status: 'Open',
      loan_purpose: applicationData.loanInfo.loanPurpose,
      employment_status: applicationData.employmentInfo.employmentStatus,
      employer: applicationData.employmentInfo.company.trim() || 'Not specified',
      employer_phone: applicationData.employmentInfo.employer_phone.trim() || 'Not specified',
      employer_address: applicationData.employmentInfo.employer_address.trim() || 'Not specified',
      job_title: applicationData.employmentInfo.position.trim() || 'Not specified',
      address: applicationData.personalInfo.address,
      promo_code: applicationData.personalInfo.promo_code,
      dob: applicationData.personalInfo.dob
    };
    console.log('Attempting to insert data:', insertData);
    const { error: insertError } = await supabase.from('applications').insert(insertData);
    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to submit application: ' + insertError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Send confirmation email if Resend is configured
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Cashew <noreply@cashew.ph>',
          to: [
            email
          ],
          cc: 'applications@cashew.ph',
          subject: 'Loan Application Submitted - Complete Your Registration',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Cashew</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
                .header h1 { color: white; margin: 0; font-size: 24px; font-weight: bold; }
                .content { padding: 30px; }
                .highlight { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
                .footer { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb; }
                .support-info { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="https://www.cashew.ph/images/cashew_logo.svg" alt="Cashew Logo" class="logo">
                  <h1>Welcome to Cashew!</h1>
                  <p style="color: #fef3c7; margin: 0; font-size: 16px;">Make Your Dream Come True</p>
                </div>
                <div class="content">
                  <p>Dear ${applicationData.personalInfo.firstName},</p>
                  <p>Thank you for choosing Cashew for your loan application. We have successfully received your application and are excited to help you achieve your financial goals.</p>
                  
                  <div class="highlight">
                    <p><strong>Application Reference Number:</strong> ${applicationId}</p>
                    <p><strong>Loan Amount:</strong> ₱${cleanLoanAmount.toLocaleString()}</p>
                    <p><strong>Status:</strong> Submitted - Pending Verification</p>
                  </div>
                  
                  <h3>What's Next?</h3>
                  <ol>
                    <li>Check your email for a verification link to complete your account setup</li>
                    <li>Our team will review your application within 24 hours</li>
                    <li>You'll receive an update on your application status via email</li>
                  </ol>
                  
                  <div class="support-info">
                    <h4>Need Help?</h4>
                    <p><strong>Customer Support:</strong><br>
                    📞 Phone: +63 (02) 8123-4567<br>
                    📧 Email: support@cashew.ph<br>
                    🕐 Hours: Monday - Friday, 9:00 AM - 6:00 PM</p>
                  </div>
                  
                  <p>We appreciate your trust in Cashew and look forward to serving you.</p>
                </div>
                <div class="footer">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">
                    Best regards,<br>
                    <strong>The Cashew Team</strong><br>
                    Making dreams come true, one loan at a time.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      // Don't fail the request if email fails
      }
    }
    return new Response(JSON.stringify({
      success: true,
      applicationId: applicationId,
      message: 'Application submitted successfully. Please check your email to verify your account.'
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
};
serve(handler);
