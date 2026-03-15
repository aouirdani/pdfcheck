// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout Session for subscription.
// Body: { priceId: string, successUrl?: string, cancelUrl?: string }
// verify_jwt=false — function handles its own auth via anonClient.auth.getUser()

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Not authenticated. Please sign in to upgrade." }, 401);
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) {
    console.error("Auth error:", authError?.message);
    return json({ error: "Session expired. Please sign in again." }, 401);
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const { priceId, successUrl, cancelUrl } = body;
  if (!priceId) return json({ error: "priceId is required" }, 400);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.error("STRIPE_SECRET_KEY not set");
    return json({ error: "Stripe is not configured" }, 500);
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const origin = req.headers.get("origin") ?? "https://pdf-tool-website-review.vercel.app";

  // ── Create Checkout session (using customer_email — no DB lookup needed) ──
  try {
    console.log(`Creating checkout for user ${user.id}, price ${priceId}`);

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${origin}?checkout=success`,
      cancel_url: cancelUrl ?? `${origin}?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
    });

    console.log(`Checkout session created: ${session.id}`);
    return json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", msg);
    return json({ error: msg }, 500);
  }
});
