import { useEffect, useState } from "react";
import { supabase } from '@/integrations/supabase/client';

export default function PaymentCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState<string>("Verifying your card...");

  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const payment_request_id =
          params.get("payment_request_id") ||
          params.get("paymentRequestId") ||
          params.get("id") ||
          localStorage.getItem("xendit_payment_request_id");

        if (!payment_request_id) {
          throw new Error("Missing payment request id");
        }

        const { error } = await supabase.functions.invoke(
          "add-payment-method",
          {
            body: { payment_request_id },
          }
        );

        if (error) throw error;

        localStorage.removeItem("xendit_payment_request_id");

        setStatus("success");
        setMessage("Card successfully added!");

        // redirect after short delay
        setTimeout(() => {
          window.location.href = "/dashboard?card_added=true";
        }, 1500);
      } catch (err: any) {
        console.error("Callback error:", err);

        setStatus("error");
        setMessage(err.message || "Failed to verify card");

        localStorage.removeItem("xendit_payment_request_id");
      }
    };

    run();
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      {status === "loading" && (
        <>
          <div style={{ marginBottom: 10 }}>⏳</div>
          <h3>{message}</h3>
        </>
      )}

      {status === "success" && (
        <>
          <div style={{ marginBottom: 10 }}>✅</div>
          <h3>{message}</h3>
          <p>Redirecting...</p>
        </>
      )}

      {status === "error" && (
        <>
          <div style={{ marginBottom: 10 }}>❌</div>
          <h3>Error</h3>
          <p>{message}</p>

          <button
            onClick={() => (window.location.href = "/payments")}
            style={{
              marginTop: 20,
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
              background: "#000",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}
