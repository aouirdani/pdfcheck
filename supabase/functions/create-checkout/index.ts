// Supabase Edge Function: create-checkout
// Body: { priceId, successUrl?, cancelUrl?, promoCode?, trial? }

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
    return json({ error: "Session expired. Please sign in again." }, 401);
  }

  let body: { priceId?: string; successUrl?: string; cancelUrl?: string; promoCode?: string; trial?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const priceId = body.priceId?.trim();
  const { successUrl, cancelUrl, promoCode, trial } = body;
  if (!priceId) return json({ error: "priceId is required" }, 400);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const origin = req.headers.get("origin") ?? "https://pdf-tool-website-review.vercel.app";

  // Validate promo code if provided
  let discounts: { promotion_code: string }[] | undefined;
  if (promoCode?.trim()) {
    try {
      const promos = await stripe.promotionCodes.list({ code: promoCode.trim(), active: true, limit: 1 });
      if (promos.data.length > 0) {
        discounts = [{ promotion_code: promos.data[0].id }];
      } else {
        return json({ error: "Invalid or expired promo code" }, 400);
      }
    } catch {
      return json({ error: "Failed to validate promo code" }, 400);
    }
  }

  try {
    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer_email: user.email,
      client_reference_id: user.id,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${origin}/dashboard?checkout=success`,
      cancel_url: cancelUrl ?? `${origin}/?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      // Allow promo codes in Stripe UI only if no code was pre-validated
      allow_promotion_codes: !discounts,
    };

    // Apply pre-validated promo code
    if (discounts) {
      (sessionParams as any).discounts = discounts;
    }

    // 7-day free trial for Pro and Starter (if requested and user hasn't used trial)
    if (trial) {
      (sessionParams as any).subscription_data = {
        trial_period_days: 7,
        metadata: { supabase_user_id: user.id },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`Checkout session created: ${session.id} for user ${user.id}`);
    return json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", msg);
    return json({ error: msg }, 500);
  }
});
