import { supabase } from '@/lib/supabase';
import { triggerPushDelivery } from './push-service';

interface BookingResult {
  success: boolean;
  action?: 'booked' | 'waitlisted';
  position?: number;
  error?: string;
}

interface CancelResult {
  success: boolean;
  cancellation_type?: 'standard' | 'late';
  error?: string;
}

export async function bookClass(
  classInstanceId: string
): Promise<BookingResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('fn_book_class', {
    p_user_id: session.user.id,
    p_class_instance_id: classInstanceId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // fn_book_class inserts a 'booking_confirmed' notification in the DB.
  // Trigger push delivery so the user gets a push confirmation.
  triggerPushDelivery();

  return data as unknown as BookingResult;
}

export async function cancelBooking(
  bookingId: string
): Promise<CancelResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase.rpc('fn_cancel_booking', {
    p_user_id: session.user.id,
    p_booking_id: bookingId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // fn_cancel_booking may insert notifications:
  // - 'waitlist_promoted' for auto-promoted users (>4h before class)
  // - Returns 'fcfs_notify_all' flag for FCFS window (30min-4h)
  const result = data as any;

  if (result.promotion_action === 'fcfs_notify_all') {
    // Fetch all waitlist entries for this class and insert FCFS notifications
    const { data: waitlistEntries } = await supabase
      .from('waitlist_entries')
      .select('user_id, class_instances(start_time, class_definitions(name))')
      .eq('class_instance_id', result.class_instance_id)
      .eq('status', 'waiting');

    if (waitlistEntries && waitlistEntries.length > 0) {
      const notifications = waitlistEntries.map((entry: any) => ({
        user_id: entry.user_id,
        title: 'Spot Available!',
        body: `A spot just opened up in ${entry.class_instances?.class_definitions?.name}! Book now - first come, first served.`,
        data: {
          type: 'fcfs_spot_available',
          class_instance_id: result.class_instance_id,
        },
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }

  // Trigger push delivery for any notifications created by the cancel flow
  // (auto-promote notification from DB function, or FCFS notifications inserted above)
  triggerPushDelivery();

  return result as CancelResult;
}

export async function leaveWaitlist(
  classInstanceId: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  // Remove the waitlist entry
  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .eq('class_instance_id', classInstanceId)
    .eq('status', 'waiting');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
