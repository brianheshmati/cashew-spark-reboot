import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const createTwimlResponse = (message: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials for phone verification webhook.");
      return new Response(createTwimlResponse("We are unable to verify your number right now. Please contact support."), {
        status: 500,
        headers: {
          "Content-Type": "text/xml"
        }
      });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("application/x-www-form-urlencoded")) {
      return new Response(createTwimlResponse("Unsupported payload."), {
        status: 400,
        headers: { "Content-Type": "text/xml" }
      });
    }

    const bodyData = await req.formData();
    const fromNumberRaw = (bodyData.get("From") as string | null) ?? "";
    const messageBody = ((bodyData.get("Body") as string | null) ?? "").trim().toUpperCase();
    const fromNumber = fromNumberRaw.replace(/\s+/g, "");

    if (!fromNumber || !messageBody) {
      return new Response(createTwimlResponse("We could not read your message. Please reply VERIFY."), {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      });
    }

    if (messageBody !== "VERIFY") {
      return new Response(createTwimlResponse("Please reply with the word VERIFY to confirm your number."), {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();
    const { error, data } = await supabase
      .from("userProfiles")
      .update({
        phone_verified: true,
        phone_verified_at: now,
        updated_at: now
      })
      .eq("phone_number", fromNumber)
      .select("user_id");

    if (error) {
      console.error("Failed to update user profile for phone verification", error);
      return new Response(createTwimlResponse("We could not verify your number at this time. Please try again later."), {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      });
    }

    if (!data || data.length === 0) {
      console.warn("No matching user profile found for phone number", fromNumber);
      return new Response(createTwimlResponse("We could not find your Cashew profile. Please contact support."), {
        status: 200,
        headers: { "Content-Type": "text/xml" }
      });
    }

    return new Response(createTwimlResponse("Thank you! Your number is now verified."), {
      status: 200,
      headers: { "Content-Type": "text/xml" }
    });
  } catch (error) {
    console.error("Unexpected error while verifying phone number", error);
    return new Response(createTwimlResponse("Something went wrong. Please try again later."), {
      status: 500,
      headers: { "Content-Type": "text/xml" }
    });
  }
});
