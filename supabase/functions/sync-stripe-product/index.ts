// supabase/functions/sync-stripe-product/index.ts
// Creates or updates a Stripe Product + Price when a membership type is saved.
// Called from the admin panel after saving a membership type to the DB.
// Requires admin role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request
    const { membershipTypeId } = await req.json();
    if (!membershipTypeId) {
      return new Response(
        JSON.stringify({ error: 'membershipTypeId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch the membership type from DB
    const { data: membershipType, error: fetchError } = await adminClient
      .from('membership_types')
      .select('*')
      .eq('id', membershipTypeId)
      .single();

    if (fetchError || !membershipType) {
      return new Response(
        JSON.stringify({ error: 'Membership type not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const priceDkk = membershipType.monthly_price_dkk;
    if (!priceDkk || priceDkk <= 0) {
      return new Response(
        JSON.stringify({ error: 'Membership type must have a positive monthly price to sync with Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create or update Stripe Product
    let stripeProductId = membershipType.stripe_product_id;
    const productData = {
      name: membershipType.name,
      description: membershipType.description || undefined,
      active: membershipType.is_active,
      metadata: {
        supabase_membership_type_id: membershipTypeId,
      },
    };

    if (stripeProductId) {
      // Update existing product
      await stripe.products.update(stripeProductId, productData);
    } else {
      // Create new product
      const product = await stripe.products.create(productData);
      stripeProductId = product.id;
    }

    // 5. Handle Price
    // Stripe Prices are immutable — if the price changed, we need to create a new one
    // and deactivate the old one.
    const priceAmountInOre = Math.round(priceDkk * 100); // Stripe uses smallest currency unit (øre for DKK)
    let stripePriceId = membershipType.stripe_price_id;
    let needNewPrice = !stripePriceId;

    if (stripePriceId) {
      // Check if the existing price matches the current amount
      try {
        const existingPrice = await stripe.prices.retrieve(stripePriceId);
        if (
          existingPrice.unit_amount !== priceAmountInOre ||
          existingPrice.currency !== 'dkk' ||
          existingPrice.recurring?.interval !== 'month'
        ) {
          // Price changed — deactivate old price, create new one
          await stripe.prices.update(stripePriceId, { active: false });
          needNewPrice = true;
        }
      } catch {
        // Price not found or error — create new one
        needNewPrice = true;
      }
    }

    if (needNewPrice) {
      const newPrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: priceAmountInOre,
        currency: 'dkk',
        recurring: { interval: 'month' },
        metadata: {
          supabase_membership_type_id: membershipTypeId,
        },
      });
      stripePriceId = newPrice.id;
    }

    // 6. Update the membership type with Stripe IDs
    await adminClient
      .from('membership_types')
      .update({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipTypeId);

    return new Response(
      JSON.stringify({
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('sync-stripe-product error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
