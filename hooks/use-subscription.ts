import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-provider';
import type { MembershipType, SubscriptionWithMembership } from '@/types/database';
import {
  getActiveSubscription,
  getSubscribableMembershipTypes,
  createCheckoutSession,
  openBillingPortal,
} from '@/services/subscription-service';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionWithMembership | null>(null);
  const [membershipTypes, setMembershipTypes] = useState<MembershipType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setMembershipTypes([]);
      setLoading(false);
      return;
    }

    const [sub, types] = await Promise.all([
      getActiveSubscription(user.id),
      getSubscribableMembershipTypes(),
    ]);

    setSubscription(sub);
    setMembershipTypes(types);
    setLoading(false);
  }, [user]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime listener for subscription changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const subscribe = async (priceId: string) => {
    setActionLoading(true);
    const { error } = await createCheckoutSession(priceId);
    setActionLoading(false);

    if (error) {
      Alert.alert('Error', error);
    }
  };

  const openPortal = async () => {
    setActionLoading(true);
    const { error } = await openBillingPortal();
    setActionLoading(false);

    if (error) {
      Alert.alert('Error', error);
    }
  };

  return {
    subscription,
    membershipTypes,
    loading,
    actionLoading,
    subscribe,
    openPortal,
    refresh,
  };
}
