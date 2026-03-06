import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-provider';
import { useRefreshOnForeground } from './use-refresh-on-foreground';
import type { BookingWithClass } from '@/types/database';

export function useBookings() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<BookingWithClass[]>([]);
  const [past, setPast] = useState<BookingWithClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const now = new Date().toISOString();

    const [upcomingResult, pastResult] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, class_instances(*, class_definitions(*))')
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .gte('class_instances.start_time', now)
        .order('created_at', { ascending: true }),
      supabase
        .from('bookings')
        .select('*, class_instances(*, class_definitions(*))')
        .eq('user_id', user.id)
        .in('status', ['completed', 'cancelled', 'late_cancelled', 'no_show'])
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (upcomingResult.error) {
      setError(upcomingResult.error.message);
    } else {
      // Filter out bookings where the join returned null (class already passed)
      const validUpcoming = (upcomingResult.data ?? []).filter(
        (b: any) => b.class_instances !== null
      ) as BookingWithClass[];
      // Sort by class start time
      validUpcoming.sort(
        (a, b) =>
          new Date(a.class_instances.start_time).getTime() -
          new Date(b.class_instances.start_time).getTime()
      );
      setUpcoming(validUpcoming);
    }

    if (pastResult.error) {
      setError(pastResult.error.message);
    } else {
      setPast(
        ((pastResult.data ?? []).filter(
          (b: any) => b.class_instances !== null
        ) as BookingWithClass[])
      );
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Refetch when app returns from background
  useRefreshOnForeground(fetchBookings);

  // Realtime subscription for booking changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`bookings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchBookings]);

  return { upcoming, past, loading, error, refetch: fetchBookings };
}
