import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function CardSuccess() {
  const [message, setMessage] =
    useState(
      "Finalizing card setup..."
    );

  useEffect(() => {
    const complete = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const payment_token_id =
          params.get("payment_token_id") ||
          params.get("paymentTokenId") ||
          params.get("id") ||
          localStorage.getItem("xendit_payment_token_id");

        if (!payment_token_id) {
          throw new Error(
            "Missing payment token."
          );
        }

        const { error } =
          await supabase.functions.invoke(
            "xendit-save-card-payment-method",
            {
              body: {
                payment_token_id,
              },
            }
          );

        if (error) {
          throw error;
        }

        localStorage.removeItem("xendit_payment_token_id");

        setMessage(
          "Card saved successfully."
        );

        setTimeout(() => {
          window.location.href =
            "/payments";
        }, 2000);
      } catch (err: any) {
        setMessage(
          err.message ||
            "Unable to complete card setup."
        );
      }
    };

    complete();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold">
        Payment Method
      </h1>

      <p className="mt-4">
        {message}
      </p>
    </div>
  );
}
