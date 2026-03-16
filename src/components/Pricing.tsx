import { useState } from "react";
import { Check, Minus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";

const PRICES = {
  starter: {
    monthly: import.meta.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID as string,
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID as string,
  },
  team: {
    monthly: import.meta.env.VITE_STRIPE_TEAM_MONTHLY_PRICE_ID as string,
    yearly:  import.meta.env.VITE_STRIPE_TEAM_YEARLY_PRICE_ID as string,
  },
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

const COMPARE = [
  { label: "PDF tools",         free: "All 23",    starter: "All 23",    pro: "All 23",     team: "All 23" },
  { label: "Daily tasks",       free: "5/day",     starter: "50/day",    pro: "Unlimited",  team: "Unlimited" },
  { label: "Max file size",     free: "25 MB",     starter: "100 MB",    pro: "500 MB",     team: "1 GB" },
  { label: "Watermark",         free: true,        starter: false,       pro: false,        team: false },
  { label: "OCR & conversions", free: false,       starter: false,       pro: true,         team: true },
  { label: "Priority",          free: false,       starter: false,       pro: true,         team: true },
  { label: "Team seats",        free: "1",         starter: "1",         pro: "1",          team: "5" },
  { label: "API access",        free: false,       starter: false,       pro: false,        team: true },
];

const FAQ = [
  { q: "Is there really a free plan?", a: "Yes — all 23 tools, 5 tasks/day, 25 MB limit. No credit card." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your dashboard and keep access until the billing period ends." },
  { q: "Is my data secure?", a: "Files are encrypted with TLS and deleted automatically after 2 hours." },
  { q: "What's the free trial?", a: "New users get 7 days free on any paid plan. No charge until the trial ends." },
  { q: "Do you offer refunds?", a: "30-day money-back guarantee, no questions asked." },
];

const PLANS = [
  {
    key:   "free" as const,
    name:  "Free",
    mo:    "€0",
    yr:    "€0",
    desc:  "Essential tools",
    feats: ["All 23 PDF tools", "5 tasks/day", "25 MB limit"],
    cta:   "Start for free",
    style: "ghost",
  },
  {
    key:   "starter" as const,
    name:  "Starter",
    mo:    "€1.99",
    yr:    "€1.25",
    yrNote:"€15/year",
    save:  "37%",
    desc:  "Regular users",
    feats: ["All 23 PDF tools", "50 tasks/day", "100 MB limit", "No watermark"],
    cta:   "Start trial",
    style: "black",
  },
  {
    key:   "pro" as const,
    name:  "Pro",
    mo:    "€4.99",
    yr:    "€3.25",
    yrNote:"€39/year",
    save:  "35%",
    desc:  "Unlimited access",
    feats: ["All 23 PDF tools", "Unlimited tasks", "500 MB limit", "No watermark", "OCR & conversions", "Priority processing"],
    cta:   "Start trial",
    style: "red",
    highlight: true,
  },
  {
    key:   "team" as const,
    name:  "Team",
    mo:    "€9.99",
    yr:    "€6.58",
    yrNote:"€79/year",
    save:  "34%",
    desc:  "Pro + team features",
    feats: ["Everything in Pro", "5 team seats", "1 GB limit", "API access"],
    cta:   "Start trial",
    style: "black",
  },
] as const;

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
    if (!user) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
    setLoading(planKey); setError("");
    try {
      const { data: { session }, error: sErr } = await supabase.auth.getSession();
      if (sErr || !session?.access_token) { window.dispatchEvent(new CustomEvent("open-auth")); return; }
      const priceId = PRICES[planKey][billing];
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ priceId, successUrl: `${window.location.origin}/dashboard?checkout=success`, cancelUrl: `${window.location.origin}/?checkout=cancelled`, promoCode: promoApplied || undefined, trial: !currentPlan || currentPlan === "free" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Server error ${res.status}`);
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Try again.");
    } finally {
      setLoading(null);
    }
  };

  const isCurrent = (k: string) => {
    if (k === "free") return !currentPlan || currentPlan === "free";
    if (k === "pro") return currentPlan === "premium";
    return currentPlan === k;
  };

  const cellStyle = (val: boolean | string) => {
    if (typeof val === "boolean") return val
      ? <Check size={15} strokeWidth={2.5} style={{ color: "var(--red)", margin: "0 auto" }} />
      : <Minus size={15} strokeWidth={2} style={{ color: "var(--gray-200)", margin: "0 auto" }} />;
    return <span style={{ fontSize: 13, color: "var(--black)" }}>{val}</span>;
  };

  return (
    <section id="pricing" style={{ borderTop: "var(--border)", borderBottom: "var(--border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 8 }}>
            PRICING
          </p>
          <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--black)", marginBottom: 12 }}>
            Start free, upgrade when ready
          </h2>
          <p style={{ fontSize: 15, color: "var(--gray-600)" }}>
            All plans include a 7-day free trial. No hidden fees.
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", border: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  height: 36,
                  padding: "0 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  background: billing === b ? "var(--red)" : "var(--white)",
                  color: billing === b ? "#fff" : "var(--gray-600)",
                  transition: "background var(--transition), color var(--transition)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: billing === "yearly" ? "rgba(255,255,255,0.3)" : "var(--red)",
                    color: "#fff",
                    padding: "2px 5px", borderRadius: 3,
                    letterSpacing: "0.05em",
                  }}>
                    SAVE 35%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plans grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 64 }}>
          {PLANS.map((p) => (
            <div
              key={p.key}
              style={{
                border: p.highlight ? "2px solid var(--black)" : "var(--border)",
                borderRadius: "var(--radius)",
                padding: 24,
                background: "var(--white)",
                position: "relative",
              }}
            >
              {/* Plan name */}
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 4 }}>
                {p.name}
              </p>
              <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 20 }}>{p.desc}</p>

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 700, color: "var(--black)", letterSpacing: "-0.03em" }}>
                  {billing === "yearly" ? p.yr : p.mo}
                </span>
                <span style={{ fontSize: 14, color: "var(--gray-400)", marginLeft: 4 }}>/mo</span>
                {"yrNote" in p && billing === "yearly" && (
                  <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2 }}>{p.yrNote}</p>
                )}
              </div>

              {/* CTA */}
              {p.key === "free" ? (
                <button
                  onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
                  disabled={isCurrent("free")}
                  style={{
                    width: "100%", height: 40, borderRadius: "var(--radius)", fontSize: 14, fontWeight: 600,
                    cursor: isCurrent("free") ? "default" : "pointer",
                    border: "var(--border)", background: "transparent",
                    color: isCurrent("free") ? "var(--gray-400)" : "var(--black)",
                    marginBottom: 20,
                  }}
                >
                  {isCurrent("free") ? "Current plan" : p.cta}
                </button>
              ) : (
                <button
                  onClick={() => !isCurrent(p.key) && handleCheckout(p.key as "starter" | "pro" | "team")}
                  disabled={loading === p.key || isCurrent(p.key)}
                  style={{
                    width: "100%", height: 40, borderRadius: "var(--radius)", fontSize: 14, fontWeight: 600,
                    cursor: (loading === p.key || isCurrent(p.key)) ? "default" : "pointer",
                    border: "none",
                    background: isCurrent(p.key) ? "var(--gray-100)" : p.style === "red" ? "var(--red)" : "var(--black)",
                    color: isCurrent(p.key) ? "var(--gray-400)" : "#fff",
                    marginBottom: 20,
                    opacity: loading === p.key ? 0.7 : 1,
                  }}
                >
                  {loading === p.key ? "Loading…" : isCurrent(p.key) ? "Current plan" : p.cta}
                </button>
              )}

              {/* Features */}
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {p.feats.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gray-600)" }}>
                    <Check size={13} strokeWidth={2.5} style={{ color: "var(--red)", flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Promo code */}
        <div style={{ maxWidth: 400, margin: "0 auto 64px", display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder="Promo code"
            value={promoCode}
            onChange={e => setPromoCode(e.target.value.toUpperCase())}
            style={{ flex: 1, height: 36, padding: "0 12px", fontSize: 13, border: "var(--border)", borderRadius: "var(--radius)", background: "var(--white)", color: "var(--black)", outline: "none" }}
          />
          <button
            onClick={() => { if (promoCode) { setPromoApplied(promoCode); } }}
            style={{ height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: "var(--radius)", background: "var(--black)", color: "#fff", cursor: "pointer" }}
          >
            Apply
          </button>
        </div>
        {promoApplied && (
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--red)", marginBottom: 32 }}>
            Promo code <strong>{promoApplied}</strong> applied
          </p>
        )}
        {error && <p style={{ textAlign: "center", fontSize: 13, color: "var(--red)", marginBottom: 24 }}>{error}</p>}

        {/* Comparison table */}
        <div style={{ border: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 64 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "var(--border)", background: "var(--gray-50)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "var(--black)", fontSize: 12 }}>Feature</th>
                {["Free", "Starter", "Pro", "Team"].map(n => (
                  <th key={n} style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: n === "Pro" ? "var(--red)" : "var(--black)", fontSize: 12 }}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row, i) => (
                <tr key={row.label} style={{ borderBottom: i < COMPARE.length - 1 ? "var(--border)" : "none", background: i % 2 === 0 ? "var(--white)" : "var(--gray-50)" }}>
                  <td style={{ padding: "10px 16px", color: "var(--gray-600)" }}>{row.label}</td>
                  {([row.free, row.starter, row.pro, row.team] as Array<boolean|string>).map((v, j) => (
                    <td key={j} style={{ padding: "10px 16px", textAlign: "center" }}>{cellStyle(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--black)", marginBottom: 24 }}>
            Frequently asked questions
          </h3>
          {FAQ.map((item, i) => (
            <div key={i} style={{ borderBottom: "var(--border)" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left", padding: "16px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 14, fontWeight: 500, color: "var(--black)",
                }}
              >
                {item.q}
                <span style={{ color: "var(--gray-400)", fontSize: 18, lineHeight: 1, flexShrink: 0, marginLeft: 16 }}>
                  {openFaq === i ? "−" : "+"}
                </span>
              </button>
              {openFaq === i && (
                <p style={{ fontSize: 14, color: "var(--gray-600)", paddingBottom: 16, lineHeight: 1.6 }}>
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
