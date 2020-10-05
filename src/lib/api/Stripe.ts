import { response } from 'express';
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

    if (!response) {
      return new Error('Failed to connect with Stripe');
    }

    return response;
  },
};
