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
        const authentication_id =
          localStorage.getItem(
            "authentication_id"
          );

        if (!authentication_id) {
          throw new Error(
            "Missing authentication."
          );
        }

        const { error } =
          await supabase.functions.invoke(
            "complete-card-authentication",
            {
              body: {
                authentication_id,
              },
            }
          );

        if (error) {
          throw error;
        }

        localStorage.removeItem(
          "authentication_id"
        );

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