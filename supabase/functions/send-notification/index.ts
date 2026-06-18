import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, type, metadata, route } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Always write to notifications table first — powers in-app dropdown
    // regardless of whether FCM delivery succeeds.
    const { data: notif, error: notifErr } = await supabase
      .from('notifications')
      .insert({ user_id, title, body, type, metadata: metadata ?? null })
      .select()
      .single();

    if (notifErr) {
      console.error('[send-notification] insert failed:', notifErr);
      return new Response(JSON.stringify({ error: notifErr.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch registered FCM tokens for this user
    const { data: devices } = await supabase
      .from('device_tokens')
      .select('push_token')
      .eq('user_id', user_id);

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, pushed: false, reason: 'no device tokens' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Get a short-lived OAuth token using the Firebase service account.
    // Uses the manual JWT approach so we don't need google-auth-library in Deno.
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT')!);
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;

    // Send to each device via FCM HTTP v1 API
    const results = await Promise.all(
      devices.map(async (device: { push_token: string }) => {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: device.push_token,
                notification: { title, body },
                data: {
                  route: route ?? '/',
                  notification_id: notif.id,
                },
                android: {
                  notification: {
                    color: '#38E0C3',
                    icon: 'ic_notification',
                    channel_id: 'studyai_default',
                  },
                },
              },
            }),
          }
        );
        if (!res.ok) {
          const err = await res.text();
          console.error('[send-notification] FCM error:', err);
        }
        return res.ok;
      })
    );

    const anySent = results.some(Boolean);

    if (anySent) {
      await supabase
        .from('notifications')
        .update({ delivered_native: true })
        .eq('id', notif.id);
    }

    return new Response(
      JSON.stringify({ success: true, pushed: anySent }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error('[send-notification] unhandled:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});

// ─── Firebase auth helpers ────────────────────────────────────────────────────
// Creates a signed JWT and exchanges it for a short-lived FCM access token.
// Pure Web Crypto — no Node.js or google-auth-library required.

async function getFirebaseAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  return data.access_token as string;
}

function base64url(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}
