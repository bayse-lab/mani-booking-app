import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { MembershipType, SubscriptionWithMembership } from '@/types/database';

/**
 * Fetch the active subscription for a user.
 * Returns null if no active/admin_granted subscription exists.
 */
export async function getActiveSubscription(
  userId: string
): Promise<SubscriptionWithMembership | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, membership_types(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'admin_granted', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data as SubscriptionWithMembership | null;
}

/**
 * Fetch membership types that have a Stripe price ID (available for purchase).
 */
export async function getSubscribableMembershipTypes(): Promise<MembershipType[]> {
  const { data, error } = await supabase
    .from('membership_types')
    .select('*')
    .eq('is_active', true)
    .not('stripe_price_id', 'is', null)
    .order('sort_order')
    .order('name');

  if (error) {
    console.error('Error fetching membership types:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Create a Stripe Checkout session and open it in the browser.
 */
export async function createCheckoutSession(priceId: string): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { priceId },
  });

  if (error) return { error: error.message };

  const result = data as { url?: string; error?: string };
  if (result.error) return { error: result.error };
  if (!result.url) return { error: 'No checkout URL returned' };

  await Linking.openURL(result.url);
  return {};
}

/**
 * Open the Stripe Billing Portal in the browser.
 */
export async function openBillingPortal(): Promise<{ error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };

  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {},
  });

  if (error) return { error: error.message };

  const result = data as { url?: string; error?: string };
  if (result.error) return { error: result.error };
  if (!result.url) return { error: 'No portal URL returned' };

  await Linking.openURL(result.url);
  return {};
}
