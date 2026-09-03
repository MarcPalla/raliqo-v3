const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { priceId, accountId } = req.body;

    if (!priceId || !accountId) {
      return res.status(400).json({
        error: "Falta priceId o accountId",
      });
    }

    const price = await stripe.prices.retrieve(priceId, {
      stripeAccount: accountId,
    });

    const mode = price.type === "recurring" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create(
      {
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        mode,

        success_url: `${process.env.DOMAIN}/?payment=success`,
        cancel_url: `${process.env.DOMAIN}/?payment=cancelled`,

        ...(mode === "subscription"
          ? {
              subscription_data: {
                application_fee_percent: 10,
              },
            }
          : {
              payment_intent_data: {
                application_fee_amount: Math.round(
                  price.unit_amount * 0.1
                ),
              },
            }),
      },
      {
        stripeAccount: accountId,
      }
    );

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
};
