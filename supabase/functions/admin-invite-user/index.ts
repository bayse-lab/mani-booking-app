// supabase/functions/admin-invite-user/index.ts
// Edge Function that invites a user via Supabase Auth Admin API.
// Creates an auth user, sends the branded invite email, then updates the
// profile with additional fields (role, name, phone, center_id, etc.).
// Also handles instructor_centers junction for instructors.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerProfile } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can invite users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const {
      email,
      full_name,
      phone,
      role = 'member',
      birthday,
      address_line1,
      address_line2,
      city,
      postal_code,
      center_id,       // single center for members
      center_ids,      // array of center ids for instructors
    } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Use service role client to invite the user
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: full_name || '',
          center_id: center_id || null,
        },
      });

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user.id;

    // 4. Update the profile with additional fields
    // (The handle_new_user trigger already created a basic profile)
    const profileUpdate: Record<string, unknown> = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (phone) profileUpdate.phone = phone;
    if (role) profileUpdate.role = role;
    if (birthday) profileUpdate.birthday = birthday;
    if (address_line1) profileUpdate.address_line1 = address_line1;
    if (address_line2) profileUpdate.address_line2 = address_line2;
    if (city) profileUpdate.city = city;
    if (postal_code) profileUpdate.postal_code = postal_code;
    if (center_id) profileUpdate.center_id = center_id;

    if (Object.keys(profileUpdate).length > 0) {
      await adminClient
        .from('profiles')
        .update(profileUpdate)
        .eq('id', newUserId);
    }

    // 5. If instructor with center_ids, create instructor_centers entries
    if (role === 'instructor' && center_ids && center_ids.length > 0) {
      const rows = center_ids.map((cId: string) => ({
        instructor_id: newUserId,
        center_id: cId,
      }));
      await adminClient.from('instructor_centers').insert(rows);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
