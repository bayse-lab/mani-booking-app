// supabase/functions/send-cancellation-email/index.ts
// Sends cancellation notification emails to users when a class is cancelled.
// Uses Supabase's built-in email (via auth.admin) or a simple SMTP approach.
//
// POST body: { recipients: [{ email, name }], class_name, class_time }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  email: string;
  name: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipients, class_name, class_time } = await req.json() as {
      recipients: Recipient[];
      class_name: string;
      class_time: string;
    };

    if (!recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No recipients' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Resend API if RESEND_API_KEY is configured, otherwise skip gracefully
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.log('RESEND_API_KEY not configured — skipping email send');
      return new Response(
        JSON.stringify({ sent: 0, message: 'Email not configured (no RESEND_API_KEY)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fromEmail = Deno.env.get('FROM_EMAIL') || 'Maní <noreply@maniformen.dk>';

    let sent = 0;
    for (const recipient of recipients) {
      const htmlBody = `
        <div style="font-family: 'Georgia', serif; max-width: 560px; margin: 0 auto; background-color: #F5E8D5; padding: 32px; border-radius: 12px;">
          <h1 style="color: #1F1A15; font-size: 24px; margin-bottom: 8px;">Hold aflyst</h1>
          <p style="color: #6b4c2f; font-size: 16px; line-height: 1.6;">
            Kære ${recipient.name || 'medlem'},
          </p>
          <p style="color: #6b4c2f; font-size: 16px; line-height: 1.6;">
            Vi beklager at måtte meddele, at <strong>${class_name}</strong>${class_time ? ` den <strong>${class_time}</strong>` : ''} er blevet aflyst.
          </p>
          <p style="color: #6b4c2f; font-size: 16px; line-height: 1.6;">
            Du er velkommen til at booke et andet hold i appen.
          </p>
          <hr style="border: none; border-top: 1px solid #E8D4B8; margin: 24px 0;" />
          <p style="color: #B8A898; font-size: 12px; text-align: center;">
            Maní — Pilates & Wellness
          </p>
        </div>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject: `${class_name} er blevet aflyst`,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        sent++;
      } else {
        const errorBody = await res.text();
        console.error(`Failed to send to ${recipient.email}: ${res.status} - ${errorBody}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, total: recipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('send-cancellation-email error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
