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

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: "10px 14px", border: "var(--border)",
    borderRadius: "var(--radius)", background: "var(--white)",
    color: "var(--black)", fontSize: 14, outline: "none",
    fontFamily: "var(--font)",
  };

  if (!isPaidPlan && !loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, border: "var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "var(--red)" }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--black)", marginBottom: 12 }}>API Access</h1>
          <p style={{ fontSize: 14, color: "var(--gray-600)", marginBottom: 32, lineHeight: 1.6 }}>
            API access is available on the <strong>Team plan</strong>. Upgrade to integrate PDFcheck into your applications.
          </p>
          <a
            href="/#pricing"
            style={{
              display: "inline-block", padding: "12px 24px",
              background: "var(--red)", color: "#fff",
              borderRadius: "var(--radius)", fontSize: 14,
              fontWeight: 600, textDecoration: "none",
            }}
          >
            View plans →
          </a>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ display: "block", margin: "16px auto 0", fontSize: 13, color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)" }}
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gray-50)", fontFamily: "var(--font)" }}>
      {/* Header */}
      <header style={{ background: "var(--white)", borderBottom: "var(--border)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{ width: 32, height: 32, border: "var(--border)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--white)", cursor: "pointer", color: "var(--gray-600)", flexShrink: 0 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--black)" }}>API Keys</p>
            <p style={{ fontSize: 12, color: "var(--gray-400)" }}>Manage your API access keys</p>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Revealed new key banner */}
        {revealed && (
          <div style={{ padding: 20, border: "1px solid var(--red)", borderRadius: "var(--radius)", background: "var(--red-subtle)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>Save your API key now</p>
            <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 12 }}>This key will only be shown once. Copy it and store it securely.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
              <code style={{ fontSize: 12, fontFamily: "monospace", color: "var(--black)", flex: 1, wordBreak: "break-all" }}>{revealed}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(revealed); toast("Copied!", "success"); }}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--red)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "var(--font)" }}
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setRevealed(null)}
              style={{ marginTop: 12, fontSize: 12, color: "var(--gray-400)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font)" }}
            >
              I've saved it, dismiss
            </button>
          </div>
        )}

        {/* Create key */}
        <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--black)", marginBottom: 12 }}>Create new API key</p>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              placeholder="Key name (e.g. Production)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              style={inputStyle}
            />
            <button
              onClick={createKey}
              disabled={creating || !newKeyName.trim()}
              style={{
                padding: "10px 20px", background: "var(--red)", color: "#fff",
                border: "none", borderRadius: "var(--radius)", fontSize: 14,
                fontWeight: 600, cursor: creating || !newKeyName.trim() ? "not-allowed" : "pointer",
                opacity: creating || !newKeyName.trim() ? 0.5 : 1,
                fontFamily: "var(--font)", flexShrink: 0,
              }}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>

        {/* Keys list */}
        <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--black)" }}>Your API keys</p>
            <span style={{ fontSize: 12, color: "var(--gray-400)" }}>{keys.filter(k => k.is_active).length} active</span>
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: "var(--gray-400)" }}>Loading…</div>
          ) : keys.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", fontSize: 14, color: "var(--gray-400)" }}>No API keys yet. Create one above.</div>
          ) : (
            keys.map((key, i) => (
              <div
                key={key.id}
                style={{
                  padding: "14px 20px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 16,
                  borderTop: i > 0 ? "var(--border)" : "none",
                  background: i % 2 === 0 ? "var(--white)" : "var(--gray-50)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--black)" }}>{key.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, border: "var(--border)",
                      color: key.is_active ? "var(--black)" : "var(--gray-400)",
                    }}>
                      {key.is_active ? "Active" : "Revoked"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--gray-400)" }}>{key.key_prefix}…</p>
                  <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2 }}>
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at && ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                {key.is_active && (
                  <button
                    onClick={() => revokeKey(key.id)}
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, fontFamily: "var(--font)" }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Docs */}
        <div style={{ background: "var(--white)", border: "var(--border)", borderRadius: "var(--radius)", padding: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 12 }}>
            API DOCUMENTATION
          </p>
          <p style={{ fontSize: 13, color: "var(--gray-600)", marginBottom: 12, lineHeight: 1.6 }}>
            Use your API key in the <code style={{ background: "var(--gray-100)", padding: "2px 6px", borderRadius: 3, fontSize: 12 }}>Authorization</code> header:
          </p>
          <div style={{ background: "var(--gray-50)", border: "var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "var(--gray-600)" }}>
            Authorization: Bearer YOUR_API_KEY
          </div>
        </div>
      </div>
    </div>
  );
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
