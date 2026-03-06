import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-provider';
import { useRefreshOnForeground } from './use-refresh-on-foreground';
import type {
  ClassInstanceWithDefinition,
  Booking,
  WaitlistEntry,
} from '@/types/database';

interface ClassDetailState {
  classInstance: ClassInstanceWithDefinition | null;
  userBooking: Booking | null;
  userWaitlistEntry: WaitlistEntry | null;
  loading: boolean;
  error: string | null;
}

export function useClassDetail(classInstanceId: string) {
  const { user } = useAuth();
  const [state, setState] = useState<ClassDetailState>({
    classInstance: null,
    userBooking: null,
    userWaitlistEntry: null,
    loading: true,
    error: null,
  });

  const fetchDetail = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const [classResult, bookingResult, waitlistResult] = await Promise.all([
      supabase
        .from('class_instances')
        .select('*, class_definitions(*), centers(name)')
        .eq('id', classInstanceId)
        .single(),
      supabase
        .from('bookings')
        .select('*')
        .eq('class_instance_id', classInstanceId)
        .eq('user_id', user.id)
        .eq('status', 'confirmed')
        .maybeSingle(),
      supabase
        .from('waitlist_entries')
        .select('*')
        .eq('class_instance_id', classInstanceId)
        .eq('user_id', user.id)
        .eq('status', 'waiting')
        .maybeSingle(),
    ]);

    if (classResult.error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: classResult.error.message,
      }));
      return;
    }

    setState({
      classInstance: classResult.data as ClassInstanceWithDefinition,
      userBooking: bookingResult.data,
      userWaitlistEntry: waitlistResult.data,
      loading: false,
      error: null,
    });
  }, [classInstanceId, user]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Refetch when app returns from background
  useRefreshOnForeground(fetchDetail);

  // Realtime subscription for spot count updates
  useEffect(() => {
    const channel = supabase
      .channel(`class-${classInstanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'class_instances',
          filter: `id=eq.${classInstanceId}`,
        },
        (payload) => {
          setState((prev) => ({
            ...prev,
            classInstance: prev.classInstance
              ? {
                  ...prev.classInstance,
                  spots_remaining: (payload.new as any).spots_remaining,
                  status: (payload.new as any).status,
                }
              : null,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classInstanceId]);

  return { ...state, refetch: fetchDetail };
}
