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
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function planColor(plan: string): string {
  switch (plan) {
    case "premium":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "team":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "starter":
      return "bg-amber-100 text-amber-700 border-amber-200";
    default:
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function planLabel(plan: string): string {
  return PLAN_LIMITS[plan as PlanKey]?.label ?? "Free";
}

function toolLabel(tool: string): string {
  const map: Record<string, string> = {
    merge: "Merge PDF",
    split: "Split PDF",
    compress: "Compress PDF",
    rotate: "Rotate PDF",
    reorder: "Reorder Pages",
    "add-pages": "Add Pages",
    "jpg-to-pdf": "JPG to PDF",
    "word-to-pdf": "Word to PDF",
    "powerpoint-to-pdf": "PPT to PDF",
    "excel-to-pdf": "Excel to PDF",
    "html-to-pdf": "HTML to PDF",
    "pdf-to-jpg": "PDF to JPG",
    "pdf-to-word": "PDF to Word",
    "pdf-to-ppt": "PDF to PPT",
    "pdf-to-excel": "PDF to Excel",
    "edit-pdf": "Edit PDF",
    watermark: "Watermark",
    sign: "Sign PDF",
    annotate: "Annotate PDF",
    protect: "Protect PDF",
    unlock: "Unlock PDF",
    ocr: "OCR",
    "page-numbers": "Page Numbers",
  };
  return map[tool] ?? tool;
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className ?? ""}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  icon,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-gray-300">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions config
// ---------------------------------------------------------------------------

const QUICK_ACTIONS = [
  { id: "merge", label: "Merge PDF", icon: "⊕" },
  { id: "compress", label: "Compress PDF", icon: "⊖" },
  { id: "pdf-to-word", label: "PDF to Word", icon: "W" },
  { id: "split", label: "Split PDF", icon: "✂" },
  { id: "ocr", label: "OCR", icon: "T" },
  { id: "watermark", label: "Watermark", icon: "≋" },
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

  // Settings forms
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sidebar/tab navigation
  const [activeSection, setActiveSection] = useState<ActiveSection>("overview");
  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    files: useRef<HTMLDivElement>(null),
    billing: useRef<HTMLDivElement>(null),
    settings: useRef<HTMLDivElement>(null),
  };

  // ---------------------------------------------------------------------------
  // Redirect if unauthenticated
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/", { replace: true });
      window.dispatchEvent(new CustomEvent("open-auth"));
    }
  }, [authLoading, user, navigate]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setDataLoading(true);

      try {
        // Profile
        const { data: profileData } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .single();

        if (profileData) setProfile(profileData as Profile);

        // Recent jobs
        const { data: jobsData } = await (supabase as any)
          .from("jobs")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (jobsData) setRecentJobs(jobsData as Job[]);

        // Usage chart — last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: usageData } = await (supabase as any)
          .from("jobs")
          .select("created_at")
          .eq("user_id", user!.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        if (usageData) {
          // Build a map of date -> count
          const counts: Record<string, number> = {};
          (usageData as { created_at: string }[]).forEach(({ created_at }) => {
            const day = created_at.slice(0, 10);
            counts[day] = (counts[day] ?? 0) + 1;
          });

          // Fill all 30 days
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
        // silently fail — data will just be empty
      } finally {
        setDataLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // ---------------------------------------------------------------------------
  // Intersection observer for active section tracking
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (Object.entries(sectionRefs) as [ActiveSection, React.RefObject<HTMLDivElement>][]).forEach(
      ([key, ref]) => {
        if (!ref.current) return;
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setActiveSection(key);
          },
          { rootMargin: "-40% 0px -50% 0px" }
        );
        obs.observe(ref.current);
        observers.push(obs);
      }
    );
    return () => observers.forEach((o) => o.disconnect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function scrollTo(section: ActiveSection) {
    sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(section);
  }

  function openTool(toolId: string) {
    navigate("/");
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("open-tool", { detail: { toolId } })
      );
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
      const msg = err instanceof Error ? err.message : "Failed to update email.";
      setEmailMsg({ ok: false, text: msg });
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
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setPwMsg({ ok: false, text: msg });
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      // Sign out — in production you would call a server function to delete the account
      await signOut();
      navigate("/");
    } catch {
      setDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / unauthenticated guard
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "User";

  const currentPlan = profile?.plan ?? plan ?? "free";
  const dailyLimit = PLAN_LIMITS[currentPlan as PlanKey]?.dailyLimit ?? 5;
  const dailyLimitLabel =
    dailyLimit === Infinity ? "Unlimited" : String(dailyLimit);

  const daysLeft = daysUntil((profile as any)?.current_period_end);
  const memberSince = profile?.created_at ? formatDate(profile.created_at) : "—";

  const loading = dataLoading || planLoading;

  // ---------------------------------------------------------------------------
  // Sidebar nav items
  // ---------------------------------------------------------------------------

  const navItems: { id: ActiveSection; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "files", label: "Recent Files" },
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Back link */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to tools
          </button>

          {/* Logo */}
          <span className="font-extrabold text-red-500 tracking-tight text-lg select-none">
            PDFcheck
          </span>

          {/* User email */}
          <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[200px]">
            {user.email}
          </span>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile tab bar */}
      {/* ------------------------------------------------------------------ */}
      <nav className="lg:hidden bg-white border-b border-gray-100 sticky top-14 z-30 overflow-x-auto">
        <div className="flex min-w-max px-4">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeSection === id
                  ? "border-red-500 text-red-500"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Main layout */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-52 flex-shrink-0">
          <nav className="sticky top-24 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-1">
            {navItems.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  activeSection === id
                    ? "bg-red-50 text-red-500"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-10">
          {/* ---------------------------------------------------------------- */}
          {/* OVERVIEW SECTION */}
          {/* ---------------------------------------------------------------- */}
          <section ref={sectionRefs.overview} id="overview">
            {/* Welcome header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-56 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-extrabold text-gray-800">
                      Welcome back, {displayName}!
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${planColor(currentPlan)}`}
                      >
                        {planLabel(currentPlan)}
                      </span>
                      {daysLeft !== null && (
                        <span className="text-xs text-gray-400">
                          {daysLeft === 0
                            ? "Expires today"
                            : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                loading={loading}
                label="Tools today"
                value={loading ? "—" : `${jobsToday} / ${dailyLimitLabel}`}
                sub="completed jobs"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                loading={loading}
                label="Max file size"
                value={loading ? "—" : `${maxFileMb} MB`}
                sub="per file upload"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                }
              />
              <StatCard
                loading={loading}
                label="Current plan"
                value={loading ? "—" : planLabel(currentPlan)}
                sub={currentPlan === "free" ? "Free tier" : "Paid subscription"}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                }
              />
              <StatCard
                loading={loading}
                label="Member since"
                value={loading ? "—" : memberSince}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>

            {/* Usage chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Tools used — last 30 days
              </h2>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="usageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                      }}
                      itemStyle={{ color: "#ef4444" }}
                      labelStyle={{ color: "#6b7280", fontWeight: 600 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="jobs"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#usageGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#ef4444" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Quick actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_ACTIONS.map(({ id, label, icon }) => (
                  <button
                    key={id}
                    onClick={() => openTool(id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-700 text-sm font-semibold transition-colors"
                  >
                    <span className="text-base leading-none select-none">{icon}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* RECENT FILES SECTION */}
          {/* ---------------------------------------------------------------- */}
          <section ref={sectionRefs.files} id="files">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Recent files
              </h2>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg
                    className="w-10 h-10 mx-auto mb-3 opacity-30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium">No files yet</p>
                  <p className="text-xs mt-1">Use a tool to process your first PDF.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentJobs.map((job) => {
                    const blobUrl =
                      job.metadata && typeof job.metadata === "object"
                        ? (job.metadata as Record<string, unknown>).blobUrl as string | undefined
                        : undefined;

                    return (
                      <div
                        key={job.id}
                        className="flex items-center justify-between py-3.5 gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Tool icon */}
                          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 text-red-400"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 truncate">
                              {toolLabel(job.tool)}
                            </p>
                            <p className="text-xs text-gray-400">{relativeTime(job.created_at)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Status badge */}
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              job.status === "done"
                                ? "bg-green-50 text-green-600 border-green-200"
                                : job.status === "error"
                                ? "bg-red-50 text-red-500 border-red-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                            }`}
                          >
                            {job.status === "done"
                              ? "Done"
                              : job.status === "error"
                              ? "Error"
                              : "Processing"}
                          </span>

                          {/* Re-download button */}
                          {job.status === "done" && blobUrl && (
                            <a
                              href={blobUrl}
                              download
                              className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
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

          {/* ---------------------------------------------------------------- */}
          {/* BILLING SECTION */}
          {/* ---------------------------------------------------------------- */}
          <section ref={sectionRefs.billing} id="billing">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-5">
                Billing
              </h2>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-4 w-44" />
                  <div className="flex gap-3 pt-3">
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-28" />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-sm font-bold px-3 py-1 rounded-full border ${planColor(currentPlan)}`}
                    >
                      {planLabel(currentPlan)} Plan
                    </span>
                    {profile?.stripe_subscription_id ? (
                      <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-semibold bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                        Free tier
                      </span>
                    )}
                  </div>

                  {(profile as any)?.current_period_end && (
                    <p className="text-sm text-gray-500 mb-1">
                      <span className="font-semibold text-gray-700">Next billing date:</span>{" "}
                      {formatDate((profile as any).current_period_end)}
                    </p>
                  )}

                  {daysLeft !== null && (
                    <p className="text-sm text-gray-500 mb-5">
                      <span className="font-semibold text-gray-700">Days remaining:</span>{" "}
                      {daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                    </p>
                  )}

                  {!daysLeft && currentPlan === "free" && (
                    <p className="text-sm text-gray-400 mb-5">
                      You are on the free plan. Upgrade to unlock more features.
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4">
                    {profile?.stripe_subscription_id && (
                      <button
                        onClick={() =>
                          window.dispatchEvent(new CustomEvent("open-billing"))
                        }
                        className="px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                      >
                        Manage Billing
                      </button>
                    )}
                    <a
                      href="/#pricing"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/");
                        setTimeout(
                          () =>
                            document
                              .getElementById("pricing")
                              ?.scrollIntoView({ behavior: "smooth" }),
                          150
                        );
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
                    >
                      Upgrade Plan
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* SETTINGS SECTION */}
          {/* ---------------------------------------------------------------- */}
          <section ref={sectionRefs.settings} id="settings" className="pb-16">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Account settings
              </h2>

              {/* Change email */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Change email</h3>
                <div className="flex gap-3 flex-wrap">
                  <input
                    type="email"
                    placeholder={user.email ?? "New email address"}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent placeholder-gray-300"
                  />
                  <button
                    onClick={handleChangeEmail}
                    disabled={emailSaving || !newEmail.trim()}
                    className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {emailSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {emailMsg && (
                  <p
                    className={`text-xs mt-2 font-medium ${
                      emailMsg.ok ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {emailMsg.text}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Change password */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">Change password</h3>
                <div className="space-y-3 max-w-sm">
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent placeholder-gray-300"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent placeholder-gray-300"
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving || !newPassword}
                    className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {pwSaving ? "Saving…" : "Update password"}
                  </button>
                </div>
                {pwMsg && (
                  <p
                    className={`text-xs mt-2 font-medium ${
                      pwMsg.ok ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {pwMsg.text}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Delete account */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-1">Delete account</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Permanently delete your account and all associated data. This action cannot be
                  undone.
                </p>
                {deleteConfirm ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-red-500 font-semibold">
                      Are you absolutely sure?
                    </span>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-5 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
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
