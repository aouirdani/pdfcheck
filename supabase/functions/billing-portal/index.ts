// Supabase Edge Function: billing-portal
// Creates a Stripe Customer Portal session for the authenticated user.

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

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Get return URL ────────────────────────────────────────────────────────
  let returnUrl = "https://pdf-tool-website-review.vercel.app";
  try {
    const body = await req.json() as { returnUrl?: string };
    if (body.returnUrl) returnUrl = body.returnUrl;
  } catch { /* optional body */ }

  // ── Fetch Stripe customer ID ───────────────────────────────────────────────
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profileError) return json({ error: "Could not fetch profile" }, 500);

  const customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (!customerId) {
    return json({ error: "No billing account found. Please subscribe first." }, 422);
  }

  // ── Create portal session ─────────────────────────────────────────────────
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return json({ url: session.url });
  } catch (err: unknown) {
    return json({ error: err instanceof Error ? err.message : "Stripe error" }, 500);
  }
});
