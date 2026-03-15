import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, BarChart2, Clock, CreditCard, Settings, Layers, Minimize2,
  FileText, Scissors, ScanText, Stamp, ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { usePlan, PLAN_LIMITS, type PlanKey } from "../hooks/usePlan";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Skeleton({ style }: { style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "var(--color-border)",
        borderRadius: 6,
        animation: "pulse 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

function StatCard({
  label, value, sub, icon, loading,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode; loading: boolean;
}) {
  if (loading) {
    return (
      <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, padding: "20px" }}>
        <Skeleton style={{ height: 12, width: 80, marginBottom: 12 }} />
        <Skeleton style={{ height: 24, width: 100, marginBottom: 8 }} />
        <Skeleton style={{ height: 10, width: 60 }} />
      </div>
    );
  }
  return (
    <div
      style={{
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
          {label}
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{sub}</div>}
    </div>
  );
}

const QUICK_ACTIONS = [
  { id: "merge",       label: "Merge PDF",    Icon: Layers    },
  { id: "compress",    label: "Compress PDF", Icon: Minimize2 },
  { id: "pdf-to-word", label: "PDF to Word",  Icon: FileText  },
  { id: "split",       label: "Split PDF",    Icon: Scissors  },
  { id: "ocr",         label: "OCR",          Icon: ScanText  },
  { id: "watermark",   label: "Watermark",    Icon: Stamp     },
];

const NAV_ITEMS: { id: ActiveSection; label: string; Icon: React.ElementType }[] = [
  { id: "overview", label: "Overview",     Icon: BarChart2  },
  { id: "files",    label: "Recent Files", Icon: Clock      },
  { id: "billing",  label: "Billing",      Icon: CreditCard },
  { id: "settings", label: "Settings",     Icon: Settings   },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

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
    files:    useRef<HTMLDivElement>(null),
    billing:  useRef<HTMLDivElement>(null),
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
      } catch {
        // silently fail
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [user]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.entries(sectionRefs) as [ActiveSection, React.RefObject<HTMLDivElement>][]).forEach(
      ([key, ref]) => {
        if (!ref.current) return;
        const obs = new IntersectionObserver(
          ([entry]) => { if (entry.isIntersecting) setActiveSection(key); },
          { rootMargin: "-40% 0px -50% 0px" }
        );
        obs.observe(ref.current);
        observers.push(obs);
      }
    );
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function scrollTo(section: ActiveSection) {
    sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(section);
  }

  function openTool(toolId: string) {
    navigate("/");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-tool", { detail: { toolId } }));
    }, 100);
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      setEmailMsg({ ok: true, text: "Confirmation email sent. Check your inbox." });
      setNewEmail("");
    } catch (err: unknown) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update email." });
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg({ ok: true, text: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwMsg({ ok: false, text: err instanceof Error ? err.message : "Failed to update password." });
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await signOut();
      navigate("/");
    } catch {
      setDeleting(false);
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 28, height: 28, border: "2px solid var(--color-accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Loading…</p>
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

  const inputStyle: React.CSSProperties = {
    height: 38,
    padding: "0 12px",
    fontSize: 13,
    border: "1px solid var(--color-border)",
    borderRadius: 6,
    background: "var(--color-bg)",
    color: "var(--color-text-primary)",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "24px",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-subtle)" }}>
      {/* Top bar */}
      <header
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => navigate("/")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to tools
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 4, background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M1 1h4v4H1zM7 1h4v4H7zM1 7h4v4H1zM7 7h4v4H7z" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>PDFcheck</span>
          </div>

          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{user.email}</span>
        </div>
      </header>

      {/* Mobile tab bar */}
      <nav
        className="lg:hidden"
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          position: "sticky",
          top: 60,
          zIndex: 30,
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", minWidth: "max-content", padding: "0 16px" }}>
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                padding: "0 16px",
                height: 44,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeSection === id ? "var(--color-accent)" : "transparent"}`,
                color: activeSection === id ? "var(--color-accent)" : "var(--color-text-secondary)",
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main layout */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        {/* Desktop sidebar */}
        <aside
          className="hidden lg:block"
          style={{ width: 240, flexShrink: 0 }}
        >
          <div
            style={{
              position: "sticky",
              top: 92,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 8,
            }}
          >
            {/* User info */}
            <div style={{ padding: "12px 12px 16px", borderBottom: "1px solid var(--color-border)", marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 2 }}>{displayName}</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: currentPlan === "free" ? "var(--color-bg-subtle)" : "var(--color-accent-subtle)",
                  color: currentPlan === "free" ? "var(--color-text-secondary)" : "var(--color-accent)",
                  border: `1px solid ${currentPlan === "free" ? "var(--color-border)" : "var(--color-accent)"}`,
                  letterSpacing: "0.02em",
                }}
              >
                {planLabel(currentPlan)}
              </span>
            </div>

            {NAV_ITEMS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  fontWeight: activeSection === id ? 600 : 450,
                  background: activeSection === id ? "var(--color-accent-subtle)" : "transparent",
                  color: activeSection === id ? "var(--color-accent)" : "var(--color-text-secondary)",
                  transition: "all 0.1s ease",
                }}
                className={activeSection !== id ? "hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]" : ""}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            ))}

            <div style={{ borderTop: "1px solid var(--color-border)", marginTop: 8, paddingTop: 8 }}>
              <button
                onClick={() => navigate("/dashboard/api")}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  background: "transparent",
                  color: "var(--color-text-secondary)",
                }}
                className="hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
              >
                <span>API Keys</span>
                <ChevronRight size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 32 }}>

          {/* OVERVIEW */}
          <section ref={sectionRefs.overview} id="overview">
            <div style={{ marginBottom: 24 }}>
              {loading ? (
                <>
                  <Skeleton style={{ height: 26, width: 220, marginBottom: 8 }} />
                  <Skeleton style={{ height: 14, width: 140 }} />
                </>
              ) : (
                <>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
                    Good morning, {displayName}
                  </h1>
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                    {daysLeft !== null
                      ? `${planLabel(currentPlan)} plan · ${daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}`
                      : `${planLabel(currentPlan)} plan`}
                  </p>
                </>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
              <StatCard loading={loading} label="Tools today" value={loading ? "—" : `${jobsToday} / ${dailyLimitLabel}`} sub="completed jobs" icon={<BarChart2 size={16} strokeWidth={1.75} />} />
              <StatCard loading={loading} label="Max file size" value={loading ? "—" : `${maxFileMb} MB`} sub="per upload" icon={<FileText size={16} strokeWidth={1.75} />} />
              <StatCard loading={loading} label="Plan" value={loading ? "—" : planLabel(currentPlan)} sub={currentPlan === "free" ? "Free tier" : "Paid"} icon={<CreditCard size={16} strokeWidth={1.75} />} />
              <StatCard loading={loading} label="Member since" value={loading ? "—" : memberSince} icon={<Settings size={16} strokeWidth={1.75} />} />
            </div>

            {/* Usage chart */}
            <div style={cardStyle}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 20 }}>
                Usage — last 30 days
              </p>
              {loading ? (
                <Skeleton style={{ height: 180, width: "100%" }} />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 6, fontSize: 12, boxShadow: "var(--shadow-md)" }}
                      itemStyle={{ color: "#2563eb" }}
                      labelStyle={{ color: "var(--color-text-secondary)", fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="jobs" stroke="#2563eb" strokeWidth={1.5} fill="url(#usageGrad)" dot={false} activeDot={{ r: 3, fill: "#2563eb" }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick actions */}
            <div style={{ ...cardStyle, marginTop: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 16 }}>
                Quick actions
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                {QUICK_ACTIONS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    onClick={() => openTool(id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "10px 14px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "transparent",
                      color: "var(--color-text-secondary)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                      textAlign: "left",
                    }}
                    className="hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)]"
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RECENT FILES */}
          <section ref={sectionRefs.files} id="files">
            <div style={cardStyle}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 20 }}>
                Recent files
              </p>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[...Array(4)].map((_, i) => <Skeleton key={i} style={{ height: 52 }} />)}
                </div>
              ) : recentJobs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
                  <Clock size={32} strokeWidth={1.25} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 4 }}>No files yet</p>
                  <p style={{ fontSize: 13 }}>Use a tool to process your first PDF.</p>
                </div>
              ) : (
                <div>
                  {recentJobs.map((job, i) => {
                    const blobUrl = job.metadata && typeof job.metadata === "object"
                      ? (job.metadata as Record<string, unknown>).blobUrl as string | undefined
                      : undefined;

                    return (
                      <div
                        key={job.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                          padding: "14px 0",
                          borderBottom: i < recentJobs.length - 1 ? "1px solid var(--color-border)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 6, background: "var(--color-accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={15} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 2 }}>{toolLabel(job.tool)}</p>
                            <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{relativeTime(job.created_at)}</p>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "3px 8px",
                              borderRadius: 4,
                              border: "1px solid",
                              ...(job.status === "done"
                                ? { background: "#f0fdf4", color: "#059669", borderColor: "#bbf7d0" }
                                : job.status === "error"
                                ? { background: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }
                                : { background: "#fffbeb", color: "#d97706", borderColor: "#fde68a" }),
                            }}
                          >
                            {job.status === "done" ? "Done" : job.status === "error" ? "Error" : "Processing"}
                          </span>

                          {job.status === "done" && blobUrl && (
                            <a
                              href={blobUrl}
                              download
                              style={{ fontSize: 12, fontWeight: 500, color: "var(--color-accent)", textDecoration: "none" }}
                            >
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
            <div style={cardStyle}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: 20 }}>
                Billing
              </p>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Skeleton style={{ height: 20, width: 160 }} />
                  <Skeleton style={{ height: 14, width: 220 }} />
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <Skeleton style={{ height: 36, width: 140 }} />
                    <Skeleton style={{ height: 36, width: 100 }} />
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        padding: "4px 10px",
                        borderRadius: 4,
                        border: "1px solid",
                        background: currentPlan === "free" ? "var(--color-bg-subtle)" : "var(--color-accent-subtle)",
                        color: currentPlan === "free" ? "var(--color-text-secondary)" : "var(--color-accent)",
                        borderColor: currentPlan === "free" ? "var(--color-border)" : "var(--color-accent)",
                      }}
                    >
                      {planLabel(currentPlan)} Plan
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: "1px solid",
                        ...(profile?.stripe_subscription_id
                          ? { background: "#f0fdf4", color: "#059669", borderColor: "#bbf7d0" }
                          : { background: "var(--color-bg-subtle)", color: "var(--color-text-muted)", borderColor: "var(--color-border)" }),
                      }}
                    >
                      {profile?.stripe_subscription_id ? "Active" : "Free tier"}
                    </span>
                  </div>

                  {(profile as any)?.current_period_end && (
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                      Next billing: <strong style={{ color: "var(--color-text-primary)" }}>{formatDate((profile as any).current_period_end)}</strong>
                    </p>
                  )}

                  {daysLeft !== null && (
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                      Days remaining: <strong style={{ color: "var(--color-text-primary)" }}>{daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}</strong>
                    </p>
                  )}

                  {!daysLeft && currentPlan === "free" && (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
                      You are on the free plan. Upgrade to unlock more features.
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {profile?.stripe_subscription_id && (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent("open-billing"))}
                        style={{ height: 36, padding: "0 16px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-primary)", cursor: "pointer" }}
                      >
                        Manage billing
                      </button>
                    )}
                    <button
                      onClick={() => { navigate("/"); setTimeout(() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }), 150); }}
                      style={{ height: 36, padding: "0 16px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", background: "var(--color-accent)", color: "#fff", cursor: "pointer" }}
                    >
                      Upgrade plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SETTINGS */}
          <section ref={sectionRefs.settings} id="settings" style={{ paddingBottom: 64 }}>
            <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 28 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                Account settings
              </p>

              {/* Change email */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>Change email</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input
                    type="email"
                    placeholder={user.email ?? "New email address"}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  />
                  <button
                    onClick={handleChangeEmail}
                    disabled={emailSaving || !newEmail.trim()}
                    style={{ height: 38, padding: "0 16px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", background: "var(--color-accent)", color: "#fff", cursor: "pointer", opacity: (emailSaving || !newEmail.trim()) ? 0.6 : 1 }}
                  >
                    {emailSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {emailMsg && (
                  <p style={{ fontSize: 12, marginTop: 8, color: emailMsg.ok ? "#059669" : "#dc2626" }}>{emailMsg.text}</p>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)" }} />

              {/* Change password */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 12 }}>Change password</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 }}>
                  <input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving || !newPassword}
                    style={{ height: 38, padding: "0 16px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", background: "var(--color-accent)", color: "#fff", cursor: "pointer", opacity: (pwSaving || !newPassword) ? 0.6 : 1, alignSelf: "flex-start" }}
                  >
                    {pwSaving ? "Saving…" : "Update password"}
                  </button>
                </div>
                {pwMsg && (
                  <p style={{ fontSize: 12, marginTop: 8, color: pwMsg.ok ? "#059669" : "#dc2626" }}>{pwMsg.text}</p>
                )}
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)" }} />

              {/* Delete account */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Delete account</h3>
                <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
                  Permanently delete your account and all data. This cannot be undone.
                </p>
                {deleteConfirm ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "#dc2626", fontWeight: 500 }}>Are you sure?</span>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      style={{ height: 36, padding: "0 14px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}
                    >
                      {deleting ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      style={{ height: 36, padding: "0 14px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    style={{ height: 36, padding: "0 14px", fontSize: 13, fontWeight: 500, borderRadius: 6, border: "1px solid #fecaca", background: "transparent", color: "#dc2626", cursor: "pointer" }}
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
