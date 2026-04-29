import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ✅ CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

serve(async (req) => {
  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('HEADERS:', Object.fromEntries(req.headers));

    // ✅ Read raw body safely
    const raw = await req.text();
    console.log('RAW BODY:', raw);

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Validate input
    if (!body.token_id) throw new Error('Missing token_id');
    if (!body.first_name) throw new Error('Missing first_name');
    if (!body.last_name) throw new Error('Missing last_name');
    if (!body.email) throw new Error('Missing email');

    // ✅ Auth (Supabase)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization');

    const accessToken = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // ✅ Xendit Bearer auth (NEW FORMAT)
    const secretKey = Deno.env.get('XENDIT_SECRET_KEY');
    if (!secretKey) throw new Error('Missing XENDIT_SECRET_KEY');

    console.log('KEY PREFIX:', secretKey.slice(0, 20));

    const xenditAuth = `Bearer ${secretKey}`;

    // ✅ Enroll card directly (NO token fetch)
    const enrollRes = await fetch(
      'https://api.xendit.co/v2/credit_card_tokens',
      {
        method: 'POST',
        headers: {
          Authorization: xenditAuth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token_id: body.token_id,
          is_single_use: false,
          should_authenticate: true,
          card_data: {
            card_holder_first_name: body.first_name,
            card_holder_last_name: body.last_name,
            card_holder_email: body.email,
          },
        }),
      }
    );

    const enrollData = await enrollRes.json();

    console.log('XENDIT RESPONSE:', enrollData);

    if (!enrollRes.ok) {
      throw new Error(enrollData.message || 'Enroll failed');
    }

    // ✅ Extract card info safely
    const card = enrollData.card_info || {};

    // ✅ Store card in DB
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        internal_user_id: userId,
        provider: 'xendit',
        provider_token_id: enrollData.id,
        brand: card.brand || null,
        last4: card.last4 || null,
        exp_month: card.exp_month || null,
        exp_year: card.exp_year || null,
        is_default: true,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('ERROR:', err.message);

    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});