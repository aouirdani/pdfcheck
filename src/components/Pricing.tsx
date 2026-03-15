import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

const PRICES = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID  as string,
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID  as string,
  },
  team: {
    monthly: import.meta.env.VITE_STRIPE_TEAM_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_TEAM_YEARLY_PRICE_ID  as string,
  },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan } = usePlan();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleCheckout = async (planKey: "starter" | "pro" | "team") => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth"));
      return;
    }
    setLoading(planKey);
    setError("");
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        window.dispatchEvent(new CustomEvent("open-auth"));
        return;
      }

      const priceId = PRICES[planKey][billing];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=cancelled`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Server error ${res.status}`);
      if (data?.url) window.location.href = data.url;
      else throw new Error(data?.error ?? "No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planKey: string) => {
    if (planKey === "free") return !currentPlan || currentPlan === "free";
    if (planKey === "pro") return currentPlan === "premium";
    return currentPlan === planKey;
  };

  const plans = [
    {
      key: "free" as const,
      name: "Free",
      monthlyPrice: "€0",
      yearlyPrice: "€0",
      period: "/forever",
      description: "Essential tools with daily limits",
      badge: null,
      borderClass: "border-gray-200",
      btnClass: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      features: [
        "All PDF tools",
        "5 tasks per day",
        "25 MB max file size",
        "Watermark on output",
      ],
      absent: ["No watermark", "OCR & conversions", "Priority processing"],
    },
    {
      key: "starter" as const,
      name: "Starter",
      monthlyPrice: "€1.99",
      yearlyPrice: "€1.25",
      yearlyNote: "€15 billed annually",
      yearSave: "37%",
      description: "More power for regular users",
      badge: null,
      borderClass: "border-blue-300",
      btnClass: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-200",
      features: [
        "All PDF tools",
        "50 tasks per day",
        "100 MB max file size",
        "No watermark",
      ],
      absent: ["OCR & conversions", "Priority processing"],
    },
    {
      key: "pro" as const,
      name: "Pro",
      monthlyPrice: "€4.99",
      yearlyPrice: "€3.25",
      yearlyNote: "€39 billed annually",
      yearSave: "35%",
      description: "Unlimited access to every tool",
      badge: "Most Popular",
      borderClass: "border-red-400",
      btnClass: "bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-200",
      features: [
        "All PDF tools",
        "Unlimited tasks",
        "500 MB max file size",
        "No watermark",
        "OCR & conversions",
        "Priority processing",
      ],
      absent: [],
    },
    {
      key: "team" as const,
      name: "Team",
      monthlyPrice: "€9.99",
      yearlyPrice: "€6.58",
      yearlyNote: "€79 billed annually",
      yearSave: "34%",
      description: "Everything Pro + team features",
      badge: null,
      borderClass: "border-purple-400",
      btnClass: "bg-purple-500 hover:bg-purple-600 text-white shadow-sm shadow-purple-200",
      features: [
        "All PDF tools",
        "Unlimited tasks",
        "1 GB max file size",
        "No watermark",
        "OCR & conversions",
        "Priority processing",
        "5 team seats",
        "Team dashboard",
        "API access",
      ],
      absent: [],
    },
  ] as const;

  return (
    <section id="pricing" className="py-16 px-4 bg-gray-50 border-b border-gray-100">
      <div className="max-w-6xl mx-auto">
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
                Save up to 37%
              </span>
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg inline-block">{error}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.key);
            const price = billing === "yearly" && plan.key !== "free" ? plan.yearlyPrice : plan.monthlyPrice;

            return (
              <div
                key={plan.key}
                className={`bg-white rounded-2xl border-2 ${plan.borderClass} p-5 relative flex flex-col ${
                  plan.badge ? "shadow-xl shadow-red-100" : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="font-bold text-gray-900 text-base">{plan.name}</h3>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-3xl font-black text-gray-900">{price}</span>
                    <span className="text-gray-400 text-sm mb-1">
                      {plan.key === "free" ? "/forever" : "/month"}
                    </span>
                  </div>
                  {billing === "yearly" && plan.key !== "free" && "yearlyNote" in plan && (
                    <p className="text-xs text-green-600 font-semibold mt-0.5">
                      {plan.yearlyNote} — save {plan.yearSave}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">{plan.description}</p>
                </div>

                <div className="mb-4">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-full font-semibold text-sm bg-green-50 text-green-700 text-center">
                      ✓ Your current plan
                    </div>
                  ) : plan.key === "free" ? (
                    <button
                      onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
                      className={`w-full py-2.5 rounded-full font-semibold text-sm transition ${plan.btnClass}`}
                    >
                      Get Started Free
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={loading === plan.key}
                      className={`w-full py-2.5 rounded-full font-semibold text-sm transition disabled:opacity-60 ${plan.btnClass}`}
                    >
                      {loading === plan.key
                        ? "Loading…"
                        : `Get ${plan.name}${billing === "yearly" ? ` (Save ${plan.yearSave})` : ""}`}
                    </button>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {plan.absent.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure payment by Stripe · Cancel anytime · No hidden fees
        </p>
      </div>
    </section>
  );
}
