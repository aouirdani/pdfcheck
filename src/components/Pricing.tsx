import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "All essential tools with daily limits",
    color: "border-gray-200",
    btnClass: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    badge: null,
    plan: null,
    features: [
      "All PDF tools included",
      "Up to 5 tasks per day",
      "Max file size 100 MB",
      "Standard processing speed",
      "Ads supported",
    ],
    missing: ["Unlimited tasks", "Priority processing", "No ads"],
  },
  {
    name: "Premium",
    price: "$7",
    period: "per month",
    description: "Unlimited access to every tool",
    color: "border-red-400 shadow-xl shadow-red-100",
    btnClass: "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200",
    badge: "Most Popular",
    plan: "premium",
    features: [
      "All PDF tools included",
      "Unlimited tasks",
      "Max file size 4 GB",
      "Priority processing speed",
      "No ads",
      "Cloud storage integration",
      "Batch processing",
    ],
    missing: [],
  },
  {
    name: "Team",
    price: "$14",
    period: "per user / month",
    description: "For teams that collaborate on PDFs",
    color: "border-gray-200",
    btnClass: "bg-gray-900 text-white hover:bg-gray-700",
    badge: null,
    plan: "team",
    features: [
      "Everything in Premium",
      "Centralized billing",
      "Admin dashboard",
      "Priority support",
      "Custom integrations",
      "API access",
    ],
    missing: [],
  },
];

export function Pricing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (plan: string) => {
    if (!user) {
      // Scroll to top and trigger auth modal by dispatching a custom event
      window.dispatchEvent(new CustomEvent("open-auth"));
      return;
    }
    setLoadingPlan(plan);
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
            plan,
            successUrl: `${window.location.origin}?checkout=success`,
            cancelUrl: `${window.location.origin}?checkout=cancelled`,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed");
      if (json.url) window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section id="pricing" className="py-16 px-4 bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Simple Pricing</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Start for free. Upgrade when you need more power.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-2xl border-2 ${plan.color} p-6 relative`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="font-bold text-gray-900 text-base">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-3xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 text-sm mb-1">/{plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{plan.description}</p>
              </div>

              <button
                onClick={() => plan.plan ? handleCheckout(plan.plan) : document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
                disabled={loadingPlan === plan.plan}
                className={`w-full py-2.5 rounded-full font-semibold text-sm transition mb-5 disabled:opacity-60 ${plan.btnClass}`}
              >
                {loadingPlan === plan.plan
                  ? "Loading…"
                  : plan.name === "Free"
                  ? "Get Started Free"
                  : `Get ${plan.name}`}
              </button>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
