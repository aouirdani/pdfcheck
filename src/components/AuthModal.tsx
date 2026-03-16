import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "signin" | "signup";

export function AuthModal({ isOpen, onClose }: Props) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => { setEmail(""); setPassword(""); setName(""); setError(""); };
  const switchTab = (t: Tab) => { setTab(t); setError(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "signin") await signIn(email, password);
      else await signUp(email, password, name || undefined);
      resetForm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Something went wrong";
      try { const p = JSON.parse(msg); msg = p.msg ?? p.message ?? msg; } catch { /* not JSON */ }
      const isNotConfigured = msg.toLowerCase().includes("provider") || msg.toLowerCase().includes("not supported") || msg.toLowerCase().includes("not enabled");
      setError(isNotConfigured ? "Google login is not configured yet. Please use email & password." : msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    border: "var(--border)",
    borderRadius: "var(--radius)",
    background: "var(--white)",
    color: "var(--black)",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "var(--font)",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { resetForm(); onClose(); } }}
    >
      <div style={{
        background: "var(--white)",
        borderRadius: "var(--radius)",
        border: "var(--border)",
        width: "100%",
        maxWidth: 400,
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--black)" }}>
              {tab === "signin" ? "Welcome back" : "Create account"}
            </p>
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2 }}>
              {tab === "signin" ? "Sign in to your PDFcheck account" : "Start using PDF tools for free"}
            </p>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            style={{ width: 32, height: 32, border: "var(--border)", borderRadius: "var(--radius)", background: "var(--white)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-400)" }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "var(--border)" }}>
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                style={{
                  flex: 1, padding: "10px 0", background: "none", border: "none",
                  borderBottom: tab === t ? "2px solid var(--black)" : "2px solid transparent",
                  fontSize: 14, fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? "var(--black)" : "var(--gray-400)",
                  cursor: "pointer", marginBottom: -1,
                  transition: "color var(--transition)",
                }}
              >
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: "100%", padding: "10px 16px", border: "var(--border)",
              borderRadius: "var(--radius)", background: "var(--white)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              fontSize: 14, color: "var(--black)", cursor: "pointer",
              opacity: googleLoading ? 0.6 : 1,
              fontFamily: "var(--font)", fontWeight: 500,
            }}
          >
            {googleLoading ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" stroke="var(--gray-200)" strokeWidth="4"/>
                <path fill="var(--gray-400)" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
            <span style={{ fontSize: 12, color: "var(--gray-400)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tab === "signup" && (
              <input
                type="text" placeholder="Full name" value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            )}
            <input
              type="email" placeholder="Email address" value={email}
              onChange={(e) => setEmail(e.target.value)} required
              style={inputStyle}
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} required minLength={6}
              style={inputStyle}
            />

            {error && (
              <div style={{
                padding: "10px 14px", border: "1px solid var(--red)",
                borderRadius: "var(--radius)", background: "var(--red-subtle)",
                fontSize: 13, color: "var(--red)",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "12px 24px",
                background: "var(--black)", color: "var(--white)",
                border: "none", borderRadius: "var(--radius)",
                fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1, fontFamily: "var(--font)",
                marginTop: 4,
              }}
            >
              {loading ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {tab === "signin" && (
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--gray-400)" }}>
              Don't have an account?{" "}
              <button
                onClick={() => switchTab("signup")}
                style={{ color: "var(--red)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)" }}
              >
                Sign up free
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
