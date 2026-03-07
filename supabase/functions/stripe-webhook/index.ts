// supabase/functions/stripe-webhook/index.ts
// Handles Stripe webhook events to keep subscriptions table in sync.
// Public endpoint — verified via Stripe signature.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Helper: get Supabase admin client
function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

// Helper: find user_id from Stripe customer ID
async function getUserIdFromCustomer(
  supabase: ReturnType<typeof createClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();
  return data?.id ?? null;
}

// Helper: find membership_type_id from Stripe price ID
async function getMembershipTypeFromPrice(
  supabase: ReturnType<typeof createClient>,
  priceId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('membership_types')
    .select('id')
    .eq('stripe_price_id', priceId)
    .single();
  return data?.id ?? null;
}

Deno.serve(async (req: Request) => {
  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // 1. Verify Stripe signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing stripe-signature header', { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', (err as Error).message);
      return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
    }

    const supabase = getAdminClient();

    // 2. Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.client_reference_id;

        if (!userId) {
          console.error('No client_reference_id in checkout session');
          break;
        }

        // Ensure stripe_customer_id is saved on profile
        await supabase
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);

        // Fetch the Stripe subscription to get price and period info
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;
        const membershipTypeId = priceId
          ? await getMembershipTypeFromPrice(supabase, priceId)
          : null;

        // Upsert subscription row
        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_subscription_id: subscriptionId,
            membership_type_id: membershipTypeId,
            status: sub.status === 'active' ? 'active' : (sub.status as string),
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' });

        // Also update the user's membership_type_id on their profile
        if (membershipTypeId) {
          await supabase
            .from('profiles')
            .update({ membership_type_id: membershipTypeId })
            .eq('id', userId);
        }

        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;

        // Map Stripe status to our status
        let status = sub.status as string;
        if (status === 'active') status = 'active';
        else if (status === 'past_due') status = 'past_due';
        else if (status === 'canceled') status = 'canceled';
        else if (status === 'trialing') status = 'trialing';

        await supabase
          .from('subscriptions')
          .update({
            status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;

        // Get the user_id before updating
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        // Clear the membership_type_id on their profile
        if (existingSub?.user_id) {
          await supabase
            .from('profiles')
            .update({ membership_type_id: null })
            .eq('id', existingSub.user_id);
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
