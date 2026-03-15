import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { toast } from "../lib/toast";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function ApiPage() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);

  const isPaidPlan = plan === "team" || plan === "premium";

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (!isPaidPlan && !loading) {
      // still show the page but with upgrade prompt
    }
    fetchKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, plan]);

  const fetchKeys = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await db.from("api_keys").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      setKeys(data ?? []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const createKey = async () => {
    if (!user || !newKeyName.trim()) return;
    setCreating(true);
    try {
      const key = `pdfcheck_${Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join("")}`;
      const { data, error } = await db.from("api_keys").insert({
        user_id: user.id,
        name: newKeyName.trim(),
        key_hash: await hashKey(key),
        key_prefix: key.slice(0, 16),
        is_active: true,
      }).select().single();
      if (error) throw error;
      setKeys((prev) => [data, ...prev]);
      setRevealed(key);
      setNewKeyName("");
      toast("API key created successfully!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create API key", "error");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      await db.from("api_keys").update({ is_active: false }).eq("id", id);
      setKeys((prev) => prev.map((k) => k.id === id ? { ...k, is_active: false } : k));
      toast("API key revoked", "warning");
    } catch {
      toast("Failed to revoke key", "error");
    }
  };

  if (!isPaidPlan && !loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/50 dark:to-violet-950/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">API Access</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            API access is available on the <strong>Team plan</strong>. Upgrade to integrate PDFcheck directly into your applications.
          </p>
          <a
            href="/#pricing"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:from-indigo-500 hover:to-violet-500 transition shadow-md"
          >
            View plans →
          </a>
          <button onClick={() => navigate("/dashboard")} className="block mx-auto mt-3 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F0F0F] py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/dashboard")} className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Keys</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your API access keys</p>
          </div>
        </div>

        {/* Revealed new key banner */}
        {revealed && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-5">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-2">⚠️ Save your API key now</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">This key will only be shown once. Copy it and store it securely.</p>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5">
              <code className="text-xs font-mono text-gray-700 dark:text-gray-300 flex-1 break-all">{revealed}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(revealed); toast("Copied!", "success"); }}
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 text-xs font-semibold flex-shrink-0"
              >
                Copy
              </button>
            </div>
            <button onClick={() => setRevealed(null)} className="mt-3 text-xs text-amber-600 dark:text-amber-400 hover:underline">
              I've saved it, dismiss
            </button>
          </div>
        )}

        {/* Create key */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Create new API key</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Key name (e.g. Production)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-md shadow-indigo-200/40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        {/* Keys list */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Your API keys</h2>
            <span className="text-xs text-gray-400">{keys.filter(k => k.is_active).length} active</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : keys.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No API keys yet. Create one above.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {keys.map((key) => (
                <div key={key.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{key.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        key.is_active
                          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                      }`}>
                        {key.is_active ? "Active" : "Revoked"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{key.key_prefix}…</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {key.is_active && (
                    <button
                      onClick={() => revokeKey(key.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Docs */}
        <div className="mt-6 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl p-5">
          <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 text-sm">API Documentation</h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed mb-3">
            Use your API key in the <code className="bg-indigo-100 dark:bg-indigo-900 px-1 py-0.5 rounded">Authorization</code> header:
          </p>
          <div className="bg-white dark:bg-gray-950 rounded-xl px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400 border border-indigo-100 dark:border-indigo-900">
            Authorization: Bearer YOUR_API_KEY
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple key hash for storage
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
