import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { usePlan, PLAN_LIMITS, type PlanKey } from "../hooks/usePlan";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  created_at: string;
  stripe_subscription_id: string | null;
  current_period_end?: string | null;
}

interface Job {
  id: string;
  tool: string;
  status: "pending" | "processing" | "done" | "error";
  created_at: string;
  metadata: Record<string, unknown>;
}

interface ChartPoint {
  date: string;
  jobs: number;
}

type ActiveSection = "overview" | "files" | "billing" | "settings";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function planLabel(plan: string): string {
  return PLAN_LIMITS[plan as PlanKey]?.label ?? "Free";
}

function toolLabel(tool: string): string {
  const map: Record<string, string> = {
    merge: "Merge PDF", split: "Split PDF", compress: "Compress PDF",
    rotate: "Rotate PDF", reorder: "Reorder Pages", "add-pages": "Add Pages",
    "jpg-to-pdf": "JPG to PDF", "word-to-pdf": "Word to PDF",
    "powerpoint-to-pdf": "PPT to PDF", "excel-to-pdf": "Excel to PDF",
    "html-to-pdf": "HTML to PDF", "pdf-to-jpg": "PDF to JPG",
    "pdf-to-word": "PDF to Word", "pdf-to-ppt": "PDF to PPT",
    "pdf-to-excel": "PDF to Excel", "edit-pdf": "Edit PDF",
    watermark: "Watermark", sign: "Sign PDF", annotate: "Annotate PDF",
    protect: "Protect PDF", unlock: "Unlock PDF", ocr: "OCR",
    "page-numbers": "Page Numbers",
  };
  return map[tool] ?? tool;
}

function StatCard({ label, value, sub, loading }: {
  label: string; value: string; sub?: string; loading: boolean;
}) {
  return (
    <div style={{
      padding: 20, border: "var(--border)", borderRadius: "var(--radius)",
      background: "var(--white)",
    }}>
      {loading ? (
        <>
          <div style={{ height: 12, width: 80, background: "var(--gray-100)", borderRadius: 4, marginBottom: 12 }} />
          <div style={{ height: 28, width: 100, background: "var(--gray-100)", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 12, width: 60, background: "var(--gray-100)", borderRadius: 4 }} />
        </>
      ) : (
        <>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--gray-400)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, color: "var(--black)", marginBottom: 4 }}>{value}</p>
          {sub && <p style={{ fontSize: 13, color: "var(--gray-400)" }}>{sub}</p>}
        </>
      )}
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: "merge", label: "Merge PDF" },
  { id: "compress", label: "Compress" },
  { id: "pdf-to-word", label: "PDF to Word" },
  { id: "split", label: "Split PDF" },
  { id: "ocr", label: "OCR" },
  { id: "watermark", label: "Watermark" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { plan, jobsToday, maxFileMb, loading: planLoading } = usePlan();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    files: useRef<HTMLDivElement>(null),
    billing: useRef<HTMLDivElement>(null),
    settings: useRef<HTMLDivElement>(null),
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
      window.dispatchEvent(new CustomEvent("open-auth"));
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      setDataLoading(true);
      try {
        const { data: profileData } = await (supabase as any)
          .from("profiles").select("*").eq("id", user!.id).single();
        if (profileData) setProfile(profileData as Profile);

        const { data: jobsData } = await (supabase as any)
          .from("jobs").select("*").eq("user_id", user!.id)
          .order("created_at", { ascending: false }).limit(5);
        if (jobsData) setRecentJobs(jobsData as Job[]);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data: usageData } = await (supabase as any)
          .from("jobs").select("created_at").eq("user_id", user!.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (usageData) {
          const counts: Record<string, number> = {};
          (usageData as { created_at: string }[]).forEach(({ created_at }) => {
            const day = created_at.slice(0, 10);
            counts[day] = (counts[day] ?? 0) + 1;
          });
          const points: ChartPoint[] = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            points.push({
              date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              jobs: counts[key] ?? 0,
            });
          }
          setChartData(points);
        }
      } catch { /* silently fail */ } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.entries(sectionRefs) as [ActiveSection, React.RefObject<HTMLDivElement>][]).forEach(([key, ref]) => {
      if (!ref.current) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(key); },
        { rootMargin: "-40% 0px -50% 0px" }
      );
      obs.observe(ref.current);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollTo(section: ActiveSection) {
    sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(section);
  }

  function openTool(toolId: string) {
    navigate("/");
    setTimeout(() => { window.dispatchEvent(new CustomEvent("open-tool", { detail: { toolId } })); }, 100);
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setEmailSaving(true); setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailMsg({ ok: true, text: "Confirmation email sent. Check your inbox." });
      setNewEmail("");
    } catch (err: unknown) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update email." });
    } finally { setEmailSaving(false); }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "Passwords do not match." }); return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: "Password must be at least 8 characters." }); return;
    }
    setPwSaving(true); setPwMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg({ ok: true, text: "Password updated successfully." });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update password." });
    } finally { setPwSaving(false); }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try { await signOut(); navigate("/"); } catch { setDeleting(false); }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: "2px solid var(--gray-200)", borderTopColor: "var(--red)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 14, color: "var(--gray-400)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const currentPlan = profile?.plan ?? plan ?? "free";
  const dailyLimit = PLAN_LIMITS[currentPlan as PlanKey]?.dailyLimit ?? 5;
  const dailyLimitLabel = dailyLimit === Infinity ? "Unlimited" : String(dailyLimit);
  const daysLeft = daysUntil((profile as any)?.current_period_end);
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : "—";
  const loading = dataLoading || planLoading;

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "files", label: "Recent Files" },
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
  ];

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", border: "var(--border)",
    borderRadius: "var(--radius)", background: "var(--white)",
    color: "var(--black)", fontSize: 14, outline: "none",
    fontFamily: "var(--font)", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", fontFamily: "var(--font)" }}>
      {/* Top bar */}
      <header style={{
        background: "var(--white)", borderBottom: "var(--border)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={() => navigate("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)" }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to tools
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--black)" }}>
            PDF<span style={{ color: "var(--red)" }}>check</span>
          </span>
          <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{user.email}</span>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav style={{
        display: "none", background: "var(--white)",
        borderBottom: "var(--border)", position: "sticky", top: 56, zIndex: 30,
        overflowX: "auto",
      }}
        className="dashboard-mobile-nav"
      >
        <div style={{ display: "flex", minWidth: "max-content", padding: "0 24px" }}>
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                padding: "12px 16px", background: "none", border: "none",
                borderBottom: activeSection === id ? "2px solid var(--red)" : "2px solid transparent",
                fontSize: 14, fontWeight: activeSection === id ? 600 : 400,
                color: activeSection === id ? "var(--black)" : "var(--gray-400)",
                cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--font)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main layout */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 32 }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          <nav style={{
            position: "sticky", top: 88,
            background: "var(--white)", border: "var(--border)",
            borderRadius: "var(--radius)", padding: "8px",
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {navItems.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "9px 12px",
                  background: activeSection === id ? "var(--gray-50)" : "none",
                  border: "none",
                  borderLeft: activeSection === id ? "2px solid var(--red)" : "2px solid transparent",
                  borderRadius: activeSection === id ? "0 var(--radius) var(--radius) 0" : "var(--radius)",
                  fontSize: 14,
                  fontWeight: activeSection === id ? 600 : 400,
                  color: activeSection === id ? "var(--black)" : "var(--gray-600)",
                  cursor: "pointer", fontFamily: "var(--font)",
                  transition: "color var(--transition)",
                }}
              >
                {label}
              </button>
            ))}

            <div style={{ height: 1, background: "var(--gray-200)", margin: "8px 0" }} />

            {/* Plan badge */}
            <div style={{ padding: "8px 12px" }}>
              <span style={{
                display: "inline-block", padding: "2px 8px",
                background: currentPlan !== "free" ? "var(--red)" : "var(--gray-100)",
                color: currentPlan !== "free" ? "#fff" : "var(--gray-600)",
                borderRadius: 99, fontSize: 11, fontWeight: 600,
              }}>
                {planLabel(currentPlan)}
              </span>
            </div>

            {/* Sign out */}
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              style={{
                width: "100%", textAlign: "left", padding: "9px 12px",
                background: "none", border: "none", fontSize: 14,
                color: "var(--red)", cursor: "pointer", fontFamily: "var(--font)",
                borderRadius: "var(--radius)",
              }}
            >
              Sign out
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 32 }}>
          {/* OVERVIEW */}
          <section ref={sectionRefs.overview} id="overview">
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--black)", marginBottom: 4 }}>
                Welcome back, {displayName}
              </h1>
              {daysLeft !== null && (
                <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
                  {daysLeft === 0 ? "Subscription expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left on ${planLabel(currentPlan)}`}
                </p>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              <StatCard loading={loading} label="Tools today" value={loading ? "—" : `${jobsToday} / ${dailyLimitLabel}`} sub="completed jobs" />
              <StatCard loading={loading} label="Max file size" value={loading ? "—" : `${maxFileMb} MB`} sub="per upload" />
              <StatCard loading={loading} label="Current plan" value={loading ? "—" : planLabel(currentPlan)} sub={currentPlan === "free" ? "Free tier" : "Paid"} />
              <StatCard loading={loading} label="Member since" value={loading ? "—" : memberSince} />
            </div>

            {/* Chart */}
            <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 24, marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 20 }}>
                TOOLS USED — LAST 30 DAYS
              </p>
              {loading ? (
                <div style={{ height: 160, background: "var(--gray-50)", borderRadius: "var(--radius)" }} />
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--red)" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="var(--red)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--gray-400)" }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--gray-400)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ border: "var(--border)", borderRadius: "var(--radius)", fontSize: 12 }}
                      itemStyle={{ color: "var(--red)" }}
                      labelStyle={{ color: "var(--gray-600)", fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="jobs" stroke="var(--red)" strokeWidth={2} fill="url(#usageGrad)" dot={false} activeDot={{ r: 4, fill: "var(--red)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 16 }}>
                QUICK ACTIONS
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                {QUICK_ACTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => openTool(id)}
                    style={{
                      padding: "10px 14px", border: "var(--border)",
                      borderRadius: "var(--radius)", background: "var(--white)",
                      fontSize: 13, color: "var(--black)", cursor: "pointer",
                      textAlign: "left", fontFamily: "var(--font)", fontWeight: 500,
                      transition: "border-color var(--transition), background var(--transition)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--black)"; e.currentTarget.style.background = "var(--gray-50)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--gray-200)"; e.currentTarget.style.background = "var(--white)"; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RECENT FILES */}
          <section ref={sectionRefs.files} id="files">
            <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 20 }}>
                RECENT FILES
              </p>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ height: 48, background: "var(--gray-50)", borderRadius: "var(--radius)" }} />
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ fontSize: 14, color: "var(--gray-400)" }}>No files yet</p>
                  <p style={{ fontSize: 13, color: "var(--gray-400)", marginTop: 4 }}>Use a tool to process your first PDF.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recentJobs.map((job, i) => {
                    const blobUrl = job.metadata && typeof job.metadata === "object"
                      ? (job.metadata as Record<string, unknown>).blobUrl as string | undefined
                      : undefined;
                    return (
                      <div
                        key={job.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 16, padding: "14px 0",
                          borderTop: i > 0 ? "var(--border)" : "none",
                          background: i % 2 === 0 ? "var(--white)" : "var(--gray-50)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 32, height: 32, border: "var(--border)",
                            borderRadius: "var(--radius)", background: "var(--white)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0, color: "var(--red)",
                          }}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--black)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {toolLabel(job.tool)}
                            </p>
                            <p style={{ fontSize: 12, color: "var(--gray-400)" }}>{relativeTime(job.created_at)}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 10px",
                            border: job.status === "done" ? "1px solid var(--gray-200)" : job.status === "error" ? "1px solid var(--red)" : "1px solid var(--gray-200)",
                            borderRadius: 99,
                            color: job.status === "done" ? "var(--black)" : job.status === "error" ? "var(--red)" : "var(--gray-400)",
                            background: "var(--white)",
                          }}>
                            {job.status === "done" ? "Done" : job.status === "error" ? "Error" : "Processing"}
                          </span>
                          {job.status === "done" && blobUrl && (
                            <a href={blobUrl} download style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", textDecoration: "none" }}>
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* BILLING */}
          <section ref={sectionRefs.billing} id="billing">
            <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 20 }}>
                BILLING
              </p>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ height: 20, width: 120, background: "var(--gray-100)", borderRadius: 4 }} />
                  <div style={{ height: 14, width: 200, background: "var(--gray-100)", borderRadius: 4 }} />
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: "var(--black)",
                      padding: "4px 12px", border: "var(--border)", borderRadius: 99,
                    }}>
                      {planLabel(currentPlan)} Plan
                    </span>
                    <span style={{
                      fontSize: 11, color: profile?.stripe_subscription_id ? "var(--black)" : "var(--gray-400)",
                      fontWeight: 600,
                    }}>
                      {profile?.stripe_subscription_id ? "Active" : "Free tier"}
                    </span>
                  </div>
                  {(profile as any)?.current_period_end && (
                    <p style={{ fontSize: 14, color: "var(--gray-600)", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: "var(--black)" }}>Next billing:</span>{" "}
                      {formatDate((profile as any).current_period_end)}
                    </p>
                  )}
                  {daysLeft !== null && (
                    <p style={{ fontSize: 14, color: "var(--gray-600)", marginBottom: 16 }}>
                      <span style={{ fontWeight: 600, color: "var(--black)" }}>Days remaining:</span>{" "}
                      {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                    </p>
                  )}
                  {!daysLeft && currentPlan === "free" && (
                    <p style={{ fontSize: 14, color: "var(--gray-400)", marginBottom: 16 }}>
                      You are on the free plan. Upgrade to unlock more features.
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                    {profile?.stripe_subscription_id && (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("open-billing"))}
                        style={{
                          padding: "10px 20px", background: "var(--white)", color: "var(--black)",
                          border: "1px solid var(--black)", borderRadius: "var(--radius)",
                          fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                        }}
                      >
                        Manage billing
                      </button>
                    )}
                    <a
                      href="/#pricing"
                      onClick={(e) => { e.preventDefault(); navigate("/"); setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 150); }}
                      style={{
                        display: "inline-block", padding: "10px 20px",
                        background: "var(--red)", color: "#fff",
                        border: "none", borderRadius: "var(--radius)",
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                        textDecoration: "none",
                      }}
                    >
                      Upgrade plan
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SETTINGS */}
          <section ref={sectionRefs.settings} id="settings" style={{ paddingBottom: 64 }}>
            <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)" }}>
                ACCOUNT SETTINGS
              </p>

              {/* Change email */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--black)", marginBottom: 12 }}>Change email</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <input
                    type="email" placeholder={user.email ?? "New email address"}
                    value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  />
                  <button
                    onClick={handleChangeEmail} disabled={emailSaving || !newEmail.trim()}
                    style={{
                      padding: "10px 20px", background: "var(--red)", color: "#fff",
                      border: "none", borderRadius: "var(--radius)", fontSize: 14,
                      fontWeight: 600, cursor: emailSaving || !newEmail.trim() ? "not-allowed" : "pointer",
                      opacity: emailSaving || !newEmail.trim() ? 0.5 : 1, fontFamily: "var(--font)",
                    }}
                  >
                    {emailSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {emailMsg && (
                  <p style={{ fontSize: 13, marginTop: 8, color: emailMsg.ok ? "var(--black)" : "var(--red)", fontWeight: 500 }}>
                    {emailMsg.text}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: "var(--gray-200)" }} />

              {/* Change password */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--black)", marginBottom: 12 }}>Change password</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
                  <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
                  <button
                    onClick={handleChangePassword} disabled={pwSaving || !newPassword}
                    style={{
                      padding: "10px 20px", background: "var(--red)", color: "#fff",
                      border: "none", borderRadius: "var(--radius)", fontSize: 14,
                      fontWeight: 600, cursor: pwSaving || !newPassword ? "not-allowed" : "pointer",
                      opacity: pwSaving || !newPassword ? 0.5 : 1, fontFamily: "var(--font)",
                      alignSelf: "flex-start",
                    }}
                  >
                    {pwSaving ? "Saving…" : "Update password"}
                  </button>
                </div>
                {pwMsg && (
                  <p style={{ fontSize: 13, marginTop: 8, color: pwMsg.ok ? "var(--black)" : "var(--red)", fontWeight: 500 }}>
                    {pwMsg.text}
                  </p>
                )}
              </div>

              <div style={{ height: 1, background: "var(--gray-200)" }} />

              {/* Delete account */}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--black)", marginBottom: 4 }}>Delete account</p>
                <p style={{ fontSize: 13, color: "var(--gray-400)", marginBottom: 16 }}>
                  Permanently delete your account and all data. This cannot be undone.
                </p>
                {deleteConfirm ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, color: "var(--red)", fontWeight: 600 }}>Are you absolutely sure?</span>
                    <button
                      onClick={handleDeleteAccount} disabled={deleting}
                      style={{
                        padding: "10px 20px", background: "var(--red)", color: "#fff",
                        border: "none", borderRadius: "var(--radius)", fontSize: 14,
                        fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                        opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      style={{
                        padding: "10px 20px", background: "var(--white)", color: "var(--black)",
                        border: "var(--border)", borderRadius: "var(--radius)", fontSize: 14,
                        fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{
                      padding: "10px 20px", background: "var(--white)", color: "var(--red)",
                      border: "1px solid var(--red)", borderRadius: "var(--radius)", fontSize: 14,
                      fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)",
                    }}
                  >
                    Delete account
                  </button>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
