import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

const PRICES = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID as string,
    yearly: import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID as string,
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string,
    yearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID as string,
  },
  team: {
    monthly: import.meta.env.VITE_STRIPE_TEAM_MONTHLY_PRICE_ID as string,
    yearly: import.meta.env.VITE_STRIPE_TEAM_YEARLY_PRICE_ID as string,
  },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const COMPARISON_FEATURES = [
  { label: "PDF tools", free: "All 20+", starter: "All 20+", pro: "All 20+", team: "All 20+" },
  { label: "Daily tasks", free: "5/day", starter: "50/day", pro: "Unlimited", team: "Unlimited" },
  { label: "Max file size", free: "25 MB", starter: "100 MB", pro: "500 MB", team: "1 GB" },
  { label: "Watermark on output", free: true, starter: false, pro: false, team: false },
  { label: "OCR & conversions", free: false, starter: false, pro: true, team: true },
  { label: "Priority processing", free: false, starter: false, pro: true, team: true },
  { label: "Team seats", free: "1", starter: "1", pro: "1", team: "5" },
  { label: "API access", free: false, starter: false, pro: false, team: true },
  { label: "Team dashboard", free: false, starter: false, pro: false, team: true },
];

const FAQ = [
  { q: "Is there really a free plan?", a: "Yes! You can use all 20+ PDF tools for free, with 5 tasks per day and a 25 MB file size limit. No credit card required." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel your subscription at any time from your dashboard. You'll keep access until the end of your billing period." },
  { q: "Is my data secure?", a: "All files are encrypted with SSL/TLS and automatically deleted from our servers after 2 hours. We never sell or share your data." },
  { q: "What's the free trial?", a: "New users get a 7-day free trial of any paid plan. No charge until the trial ends, and you can cancel anytime." },
  { q: "Do you offer refunds?", a: "Yes, we offer a 30-day money-back guarantee on all paid plans. No questions asked." },
];

export function Pricing() {
  const { user } = useAuth();
  const { plan: currentPlan } = usePlan();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/?checkout=cancelled`,
          promoCode: promoApplied || undefined,
          trial: !currentPlan || currentPlan === "free",
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
      description: "Essential tools with daily limits",
      badge: null,
      cardClass: "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
      btnClass: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
      features: ["All 20+ PDF tools", "5 tasks per day", "25 MB max file size"],
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
      cardClass: "border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900",
      btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/40 dark:shadow-indigo-900/40",
      features: ["All 20+ PDF tools", "50 tasks per day", "100 MB max file size", "No watermark"],
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
      cardClass: "border-violet-400 dark:border-violet-600 bg-gradient-to-b from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/30 dark:to-violet-950/30",
      btnClass: "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-200/40 dark:shadow-indigo-900/40",
      features: ["All 20+ PDF tools", "Unlimited tasks", "500 MB max file size", "No watermark", "OCR & conversions", "Priority processing"],
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
      cardClass: "border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900",
      btnClass: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200/40 dark:shadow-purple-900/40",
      features: ["All 20+ PDF tools", "Unlimited tasks", "1 GB max file size", "No watermark", "OCR & conversions", "Priority processing", "5 team seats", "API access"],
    },
  ] as const;

  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50 dark:bg-[#0A0A0A] border-y border-gray-100 dark:border-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-4 py-2 rounded-full mb-5">
            ✦ Simple, transparent pricing
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Start free, upgrade when ready
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base max-w-md mx-auto">
            No hidden fees. Cancel anytime. All plans include a 7-day free trial.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="inline-flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === "yearly"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Yearly
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                Save 37%
              </span>
            </button>
          </div>

          {/* Promo code */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-36 placeholder-gray-400"
            />
            <button
              onClick={() => { if (promoCode) { setPromoApplied(promoCode); setError(""); } }}
              className="px-4 py-2 text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl hover:opacity-90 transition"
            >
              Apply
            </button>
            {promoApplied && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                </svg>
                {promoApplied}
              </span>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.key);
            const price = billing === "yearly" && plan.key !== "free" ? plan.yearlyPrice : plan.monthlyPrice;
            const isPro = plan.key === "pro";

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border-2 ${plan.cardClass} p-6 flex flex-col ${isPro ? "shadow-xl shadow-violet-100/50 dark:shadow-violet-900/30 scale-[1.02] z-10" : ""}`}
              >
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
                      ✦ Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">{plan.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{plan.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{price}</span>
                    <span className="text-gray-400 text-sm mb-1">{plan.key === "free" ? "/forever" : "/mo"}</span>
                  </div>
                  {billing === "yearly" && plan.key !== "free" && "yearlyNote" in plan && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      {plan.yearlyNote} · Save {plan.yearSave}
                    </p>
                  )}
                </div>

                <div className="mb-5">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl font-semibold text-sm bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-center border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                      Current plan
                    </div>
                  ) : plan.key === "free" ? (
                    <button
                      onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition ${plan.btnClass}`}
                    >
                      Get Started Free
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={loading === plan.key}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-60 ${plan.btnClass}`}
                    >
                      {loading === plan.key ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Loading…
                        </span>
                      ) : (!currentPlan || currentPlan === "free")
                        ? `Try ${plan.name} free — 7 days`
                        : `Get ${plan.name}${billing === "yearly" ? ` (save ${plan.yearSave})` : ""}`}
                    </button>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden mb-14">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">Feature comparison</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Feature</th>
                  {["Free", "Starter", "Pro", "Team"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-center ${h === "Pro" ? "text-indigo-600 dark:text-indigo-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => (
                  <tr key={row.label} className={`border-b border-gray-50 dark:border-gray-800/50 ${i % 2 === 0 ? "bg-gray-50/30 dark:bg-gray-800/20" : ""}`}>
                    <td className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">{row.label}</td>
                    {([row.free, row.starter, row.pro, row.team] as (boolean | string)[]).map((val, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        {typeof val === "boolean" ? (
                          val
                            ? <svg className="w-4 h-4 text-emerald-500 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            : <svg className="w-4 h-4 text-gray-300 dark:text-gray-700 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                          <span className={`text-xs font-medium ${j === 2 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-gray-600 dark:text-gray-400"}`}>{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-6">Frequently asked questions</h3>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.q}</span>
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-3 animate-fade-up">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust footer */}
        <div className="text-center mt-10">
          <p className="text-xs text-gray-400 flex items-center justify-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure payment by Stripe
            </span>
            <span>·</span>
            <span>Cancel anytime</span>
            <span>·</span>
            <span>30-day money-back guarantee</span>
            <span>·</span>
            <span>No hidden fees</span>
          </p>
        </div>
      </div>
    </section>
  );
}
