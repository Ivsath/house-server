import stripe from 'stripe';

const client = new stripe(`${process.env.S_SECRET_KEY}`, {
  apiVersion: '2020-08-27',
});

export const Stripe = {
  connect: async (code: string) => {
    const response = await client.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    return response;
  },
  charge: async (amount: number, source: string, stripeAccount: string) => {
    const paymentIntent = await client.paymentIntents.create(
      {
        payment_method_types: [source],
        amount,
        currency: 'usd',
        application_fee_amount: Math.round(amount * 0.05),
      },
      {
        stripeAccount: stripeAccount,
      },
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Failed to create charge with stripe');
    }
  },
};
