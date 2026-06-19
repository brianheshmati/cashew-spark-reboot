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
  },
});

async function createSubscription() {
  try {
    const payload = {
      reference_id: `test-sub-${Date.now()}`,

      customer_id: "cust-test-001",

      currency: "PHP",

      amount: 100,

      schedule: {
        interval: "WEEK",
        interval_count: 2,
        total_recurrence: 4,
        anchor_date: "2026-06-20T00:00:00Z",

        retry_interval: "DAY",
        retry_interval_count: 1,
        total_retry: 3
      },

      payment_tokens: [
        {
          payment_token_id: "pt-test-token-id",
          rank: 1
        }
      ],

      immediate_payment: false,

      failed_cycle_action: "RESUME",

      notification_channels: [
        "EMAIL"
      ],

      metadata: {
        source: "local-node-test"
      },

      description:
        "Test subscription: PHP 100 every 2 weeks, 4 payments"
    };

    const response = await api.post(
      "/recurring/plans",
      payload
    );

    console.log(
      JSON.stringify(response.data, null, 2)
    );
  } catch (err) {
    console.error(
      "ERROR:",
      err.response?.data || err.message
    );
  }
}

createSubscription();