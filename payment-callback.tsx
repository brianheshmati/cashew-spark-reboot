import { useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';

export default function PaymentCallback() {
  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const authentication_id = params.get("authentication_id");
        const token_id = localStorage.getItem("xendit_token_id");

        if (!authentication_id || !token_id) {
          throw new Error("Missing authentication_id or token_id");
        }

        const { error } = await supabase.functions.invoke(
          "add-payment-method",
          {
            body: {
              token_id,
              authentication_id,
            },
          }
        );

        if (error) throw error;

        // cleanup
        localStorage.removeItem("xendit_token_id");

        // success redirect
        window.location.href = "/dashboard?card_added=true";

      } catch (err) {
        console.error("Callback error:", err);
      }
    };

    run();
  }, []);

  return <div>Verifying your card...</div>;
}