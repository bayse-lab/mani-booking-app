// supabase/functions/push-notify/index.ts
// Supabase Edge Function that sends pending push notifications via Expo Push API.
//
// Can be invoked in two ways:
// 1. POST with { notification_ids: string[] } — send specific notifications
// 2. POST with no body or {} — process all unsent notifications
//
// Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS and read push tokens from profiles.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional request body
    let notificationIds: string[] | null = null;
    try {
      const body = await req.json();
      if (body?.notification_ids && Array.isArray(body.notification_ids)) {
        notificationIds = body.notification_ids;
      }
    } catch {
      // No body or invalid JSON — process all unsent
    }

    // Build query for unsent notifications with user push tokens
    let query = supabase
      .from('notifications')
      .select('id, user_id, title, body, data, profiles(expo_push_token)')
      .eq('is_sent', false)
      .limit(100);

    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No pending notifications' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Expo push messages (skip users without a push token)
    const messages: ExpoPushMessage[] = [];
    const sentIds: string[] = [];
    const skippedIds: string[] = [];

    for (const notification of notifications as any[]) {
      const pushToken = notification.profiles?.expo_push_token;

      if (!pushToken) {
        skippedIds.push(notification.id);
        continue;
      }

      messages.push({
        to: pushToken,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
      });
      sentIds.push(notification.id);
    }

    // Send via Expo Push API in chunks of 100
    let totalSent = 0;
    const CHUNK_SIZE = 100;

    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Expo Push API error: ${response.status} - ${errorBody}`);
        // Continue with remaining chunks instead of throwing
      } else {
        totalSent += chunk.length;
      }
    }

    // Mark successfully sent notifications
    if (sentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        })
        .in('id', sentIds);

      if (updateError) {
        console.error('Failed to mark notifications as sent:', updateError);
      }
    }

    // Also mark skipped notifications (no push token) as sent to avoid retrying
    if (skippedIds.length > 0) {
      await supabase
        .from('notifications')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString(),
        })
        .in('id', skippedIds);
    }

    return new Response(
      JSON.stringify({
        sent: totalSent,
        skipped: skippedIds.length,
        total: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('push-notify error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
