import { useState } from "react";
import { usePlan } from "../hooks/usePlan";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const planLabel: Record<string, { label: string; classes: string }> = {
  free:    { label: "Free",    classes: "bg-gray-100 text-gray-600" },
  premium: { label: "Premium", classes: "bg-amber-100 text-amber-700" },
  team:    { label: "Team",    classes: "bg-purple-100 text-purple-700" },
};

export function BillingModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const { plan, jobsToday, jobsThisMonth, loading, isPro } = usePlan();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  if (!isOpen) return null;

  const currentPlan = plan ?? "free";
  const badge = planLabel[currentPlan] ?? planLabel["free"];

  const handleManageBilling = async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: fnData, error: fnError } = await (supabase as any).functions.invoke(
        "create-portal",
        {
          body: { returnUrl: window.location.href },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (fnError) throw new Error(fnError.message ?? "Failed to open billing portal");

      const url = fnData?.url as string | undefined;
      if (!url) throw new Error("No portal URL returned");

      window.location.href = url;
    } catch (err: unknown) {
      setPortalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = () => {
    onClose();
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Billing &amp; Plan
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition text-gray-500"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current plan */}
          <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Current Plan</p>
              {loading ? (
                <div className="h-5 w-20 bg-gray-200 animate-pulse rounded mt-1" />
              ) : (
                <p className="font-bold text-gray-800 mt-0.5">{badge.label}</p>
              )}
            </div>
            {!loading && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${badge.classes}`}>
                {badge.label.toUpperCase()}
              </span>
            )}
          </div>

          {/* Account email */}
          {user && (
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Account</p>
              <p className="text-sm text-gray-700 font-medium truncate">{user.email}</p>
            </div>
          )}

          {/* Usage */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Usage</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                {loading ? (
                  <div className="h-6 w-8 bg-gray-200 animate-pulse rounded mx-auto" />
                ) : (
                  <p className="text-xl font-extrabold text-gray-800">{jobsToday}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">Today</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
                {loading ? (
                  <div className="h-6 w-8 bg-gray-200 animate-pulse rounded mx-auto" />
                ) : (
                  <p className="text-xl font-extrabold text-gray-800">{jobsThisMonth}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">This Month</p>
              </div>
            </div>

            {/* Free plan usage bar */}
            {!isPro && !loading && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Daily limit</span>
                  <span>{jobsToday}/5 used</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-red-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min((jobsToday / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {portalError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">{portalError}</p>
          )}

          {/* CTA */}
          {isPro ? (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="w-full py-3 rounded-full bg-gray-800 hover:bg-gray-900 text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {portalLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Opening portal…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Manage Billing
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-sm transition shadow-md shadow-orange-200"
            >
              Upgrade to Pro — $7/mo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
