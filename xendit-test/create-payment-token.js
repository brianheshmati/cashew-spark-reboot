//require("dotenv").config();

require("dotenv").config({
  path: "../.env"
});

const axios = require("axios");

async function createPaymentToken() {
  try {
    const payload = {
        reference_id: process.env.REFERENCE_ID,

        country: "PH",
        currency: "PHP",
        
        channel_code: "CARDS",
        type: "INDIVIDUAL",
        customer: {
            reference_id: "cashew123",// process.env.REFERENCE_ID,
            type: "INDIVIDUAL",
            individual_detail: {
                given_names: "Behrouz",
                surname: "Heshmatipour"
            },
            email: process.env.CARDHOLDER_EMAIL,
            mobile_number: process.env.CARDHOLDER_MOBILE,
        },
        
        channel_properties: {
            card_details: {
                    cardholder_first_name: "Behrouz",
                    cardholder_last_name: "Heshmatipour",
                    card_number: process.env.CARD_NUMBER,
                    expiry_month: process.env.CARD_EXP_MONTH,
                    expiry_year: process.env.CARD_EXP_YEAR,
                    cvn: process.env.CARD_CVN,
                    cardholder_name: process.env.CARDHOLDER_NAME,
                    cardholder_email: process.env.CARDHOLDER_EMAIL,
                    
                },
                skip_three_ds: false,
                billing_information: {
                    first_name: "Behrouz",
                    last_name: "Heshmatipour",
                    email: process.env.CARDHOLDER_EMAIL,
                    city: "Mandaue city",
                    country: "PH",
                    postal_code: "6014",
                    street_line1: "4th Floor SBPO Building Hernan Cortes St., Cabancalan",
                    street_line2: "",
                    province_state: "Cebu"
                },
            success_return_url: process.env.SUCCESS_RETURN_URL,
            failure_return_url: process.env.FAILURE_RETURN_URL,
        },
        description: "Save card for future payments",
        metadata: {
            customer_id: process.env.REFERENCE_ID,
            card_usage: "subscription"
        },

        };

    console.log("=== REQUEST ===");
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.post(
      "https://api.xendit.co/v3/payment_tokens",
      payload,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString(
              "base64"
            ),
          "Content-Type": "application/json",
          "api-version": "2024-11-11" 
        },
      }
    );

    console.log("\n=== RESPONSE ===");
    console.log(JSON.stringify(response.data, null, 2));

    console.log("\n=== PAYMENT TOKEN ID ===");
    console.log(response.data.id);

  } catch (err) {
    console.error("\n=== ERROR ===");

    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

createPaymentToken();