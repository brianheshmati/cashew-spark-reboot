require("dotenv").config();
const axios = require("axios");

//const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_SECRET_KEY="xnd_production_PrfpkMGgaS4wzc5Fjv7lU6L9UIYt5KBuc5lW9vLJ0Pj3mWPVVyiT13yWuQ3zzB";

const api = axios.create({
  baseURL: "https://api.xendit.co",
  auth: {
    username: XENDIT_SECRET_KEY,
    password: "",
  },
  headers: {
    "Content-Type": "application/json",
    "api-version": "2026-01-01",
  },
});

async function createSubscription() {
  try {
    console.log("=== CUSTOMER ===");

    const customer = await api.get(
      "/customers/68952b48-be9b-4ece-9bee-0bb27345c330"
    );

    console.log(
      JSON.stringify(customer.data, null, 2)
    );

    console.log("\n=== CREATING SUBSCRIPTION ===");

    const payload = {
      reference_id: `test-sub-${Date.now()}`,

      customer_id: "68952b48-be9b-4ece-9bee-0bb27345c330",

      currency: "PHP",

      amount: 100,

      schedule: {
        interval: "WEEK",
        interval_count: 2,
        total_recurrence: 4,
        anchor_date: "2026-06-20T00:00:00Z"
      },

      payment_tokens: [
        {
          payment_token_id: "69f3cae4e4b50b868e6a8f41",
          rank: 1
        }
      ],

      metadata: {
        source: "local-node-test"
      },

      description:
        "PHP 100 every 2 weeks for 4 cycles"
    };

    console.log(
      "REQUEST:",
      JSON.stringify(payload, null, 2)
    );

    const response = await api.post(
      "/recurring/plans",
      payload
    );

    console.log(
      "\n=== SUCCESS ===\n",
      JSON.stringify(response.data, null, 2)
    );
  } catch (err) {
    console.log("\n=== ERROR ===");

    if (err.response) {
      console.log(
        JSON.stringify(err.response.data, null, 2)
      );
    } else {
      console.log(err.message);
    }
  }
}

createSubscription();