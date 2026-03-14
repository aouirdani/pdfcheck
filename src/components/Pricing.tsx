import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID as string;
const YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID as string;

export function Pricing() {
  const { user } = useAuth();
  const { isPro } = usePlan();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async (priceId: string) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            priceId,
            successUrl: `${window.location.origin}?checkout=success`,
            cancelUrl: `${window.location.origin}?checkout=cancelled`,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const priceId = billing === "monthly" ? MONTHLY_PRICE_ID : YEARLY_PRICE_ID;

  return (
    <section id="pricing" className="py-16 px-4 bg-gray-50 border-b border-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Simple, Transparent Pricing</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Start for free. Upgrade when you need more power.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition ${
                billing === "monthly"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-1.5 rounded-full text-sm font-semibold transition flex items-center gap-1.5 ${
                billing === "yearly"
                  ? "bg-white text-gray-800 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Yearly
              <span className="bg-green-100 text-green-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                -34%
              </span>
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Free plan */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
            <div className="mb-5">
              <h3 className="font-bold text-gray-900 text-base">Free</h3>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-3xl font-black text-gray-900">€0</span>
                <span className="text-gray-400 text-sm mb-1">/forever</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5">All essential tools with daily limits</p>
            </div>

            <button
              onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-2.5 rounded-full font-semibold text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition mb-5"
            >
              Get Started Free
            </button>

            <ul className="space-y-2">
              {[
                "All 24 PDF tools",
                "Up to 5 tasks per day",
                "Max file size 25 MB",
                "Standard processing",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
              {["Unlimited tasks", "Priority processing", "1 GB file uploads"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro plan */}
          <div className="bg-white rounded-2xl border-2 border-red-400 shadow-xl shadow-red-100 p-6 relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                Most Popular
              </span>
            </div>

            <div className="mb-5">
              <h3 className="font-bold text-gray-900 text-base">Pro</h3>
              <div className="flex items-end gap-1 mt-2">
                <span className="text-3xl font-black text-gray-900">
                  {billing === "monthly" ? "€9.99" : "€6.58"}
                </span>
                <span className="text-gray-400 text-sm mb-1">/month</span>
              </div>
              {billing === "yearly" && (
                <p className="text-xs text-green-600 font-semibold mt-0.5">€79 billed annually — save €41</p>
              )}
              <p className="text-xs text-gray-500 mt-1.5">Unlimited access to every tool</p>
            </div>

            {isPro ? (
              <div className="w-full py-2.5 rounded-full font-semibold text-sm bg-green-50 text-green-700 text-center mb-5">
                ✓ Your current plan
              </div>
            ) : (
              <button
                onClick={() => handleCheckout(priceId)}
                disabled={loading}
                className="w-full py-2.5 rounded-full font-semibold text-sm bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200 transition mb-5 disabled:opacity-60"
              >
                {loading ? "Loading…" : `Get Pro ${billing === "yearly" ? "(Save 34%)" : ""}`}
              </button>
            )}

            <ul className="space-y-2">
              {[
                "All 24 PDF tools",
                "Unlimited tasks",
                "Max file size 1 GB",
                "Priority processing",
                "No ads",
                "Job history & re-download",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure payment by Stripe · Cancel anytime · No hidden fees
        </p>
      </div>
    </section>
  );
}
