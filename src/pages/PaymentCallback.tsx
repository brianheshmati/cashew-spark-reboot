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
        const authentication_id = params.get("authentication_id");

        if (!authentication_id) {
          throw new Error("Missing authentication_id");
        }

        // 🔥 Call backend to verify + save card
        const { error } = await supabase.functions.invoke(
          "add-payment-method",
          {
            body: { authentication_id },
          }
        );

        if (error) throw error;

        // cleanup token
        localStorage.removeItem("xendit_token_id");

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

        // optional cleanup
        localStorage.removeItem("xendit_token_id");
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