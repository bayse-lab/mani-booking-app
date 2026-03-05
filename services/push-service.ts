import { supabase } from '@/lib/supabase';

/**
 * Trigger the push-notify edge function to process and send
 * all unsent notifications. Call this after any booking operation
 * that creates notification records.
 */
export async function triggerPushDelivery(): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('push-notify');
    if (error) {
      console.warn('Push delivery trigger failed:', error.message);
    }
  } catch (err) {
    // Push delivery failure should not block the user flow
    console.warn('Push delivery trigger error:', err);
  }
}

/**
 * Trigger push delivery for specific notification IDs.
 * Use when you know exactly which notifications were just created.
 */
export async function triggerPushForNotifications(
  notificationIds: string[]
): Promise<void> {
  if (notificationIds.length === 0) return;

  try {
    const { error } = await supabase.functions.invoke('push-notify', {
      body: { notification_ids: notificationIds },
    });
    if (error) {
      console.warn('Push delivery trigger failed:', error.message);
    }
  } catch (err) {
    console.warn('Push delivery trigger error:', err);
  }
}
