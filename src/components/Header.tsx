import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";
import { AuthModal } from "./AuthModal";

interface Props {
  onSearch: (query: string) => void;
  onHistory?: () => void;
  onBilling?: () => void;
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return [dark, setDark] as const;
}

const S = {
  header: {
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
    height: 56,
    background: "var(--white)",
    borderBottom: "var(--border)",
    display: "flex",
    alignItems: "center",
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 32,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    textDecoration: "none",
    flexShrink: 0,
  },
  navLink: {
    fontSize: 14,
    color: "var(--gray-600)",
    textDecoration: "none",
    padding: "4px 0",
    transition: "color var(--transition)",
  },
  btn: (variant: "red" | "ghost") => ({
    height: 34,
    padding: "0 16px",
    borderRadius: "var(--radius)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background var(--transition), border-color var(--transition)",
    border: variant === "ghost" ? "var(--border)" : "none",
    background: variant === "red" ? "var(--red)" : "transparent",
    color: variant === "red" ? "#fff" : "var(--black)",
  }),
  iconBtn: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "var(--border)",
    borderRadius: "var(--radius)",
    background: "transparent",
    color: "var(--gray-600)",
    cursor: "pointer",
    transition: "border-color var(--transition), color var(--transition)",
    flexShrink: 0,
  },
};

export function Header({ onSearch, onHistory, onBilling }: Props) {
  const { user, signOut } = useAuth();
  const { plan } = usePlan();
  const [dark, setDark] = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const handler = () => setShowAuth(true);
    window.addEventListener("open-auth", handler);
    return () => window.removeEventListener("open-auth", handler);
  }, []);

  // Lock scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const planLabel = plan && plan !== "free" ? plan.toUpperCase() : null;

  return (
    <>
      <header style={S.header}>
        <div style={S.inner}>
          {/* Logo */}
          <a href="/" style={S.logo}>
            <span style={{ fontSize: 17, fontWeight: 700, color: "var(--black)", letterSpacing: "-0.02em" }}>
              <span style={{ color: "var(--black)" }}>PDF</span>
              <span style={{ color: "var(--red)" }}>check</span>
            </span>
          </a>

          {/* Desktop Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }} className="hidden md:flex">
            {[
              { label: "Tools", href: "#tools" },
              { label: "Pricing", href: "#pricing" },
            ].map(({ label, href }) => (
              <a key={label} href={href} style={S.navLink}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--black)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--gray-600)")}
              >
                {label}
              </a>
            ))}
            {user && (
              <a href="/dashboard" style={S.navLink}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--black)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--gray-600)")}
              >
                Dashboard
              </a>
            )}
          </nav>

          {/* Search */}
          <div style={{ flex: 1 }} className="hidden md:block">
            <div style={{ position: "relative", maxWidth: 320 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search tools…"
                value={searchVal}
                onChange={handleSearch}
                style={{
                  width: "100%",
                  height: 34,
                  paddingLeft: 32,
                  paddingRight: 12,
                  fontSize: 14,
                  border: "var(--border)",
                  borderRadius: "var(--radius)",
                  background: "var(--gray-50)",
                  color: "var(--black)",
                  outline: "none",
                  transition: "border-color var(--transition)",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--black)")}
                onBlur={e => (e.target.style.borderColor = "var(--gray-200)")}
              />
            </div>
          </div>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }} className="flex-shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              style={S.iconBtn}
              title={dark ? "Light mode" : "Dark mode"}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--black)"; (e.currentTarget as HTMLElement).style.color = "var(--black)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gray-200)"; (e.currentTarget as HTMLElement).style.color = "var(--gray-600)"; }}
            >
              {dark ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    style={{
                      height: 34,
                      padding: "0 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "var(--border)",
                      borderRadius: "var(--radius)",
                      background: "transparent",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "var(--black)",
                    }}
                  >
                    <span style={{
                      width: 22, height: 22, borderRadius: 4,
                      background: "var(--red)", color: "#fff",
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {user.email?.[0]?.toUpperCase() ?? "U"}
                    </span>
                    {planLabel && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: "var(--red)", color: "#fff",
                        padding: "2px 6px", borderRadius: 3,
                        letterSpacing: "0.05em",
                      }}>
                        {planLabel}
                      </span>
                    )}
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setDropdownOpen(false)} />
                      <div style={{
                        position: "absolute", right: 0, top: "calc(100% + 6px)",
                        width: 220, background: "var(--white)",
                        border: "var(--border)", borderRadius: "var(--radius)",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                        zIndex: 50, overflow: "hidden",
                      }}>
                        <div style={{ padding: "12px 16px", borderBottom: "var(--border)" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--black)" }}>{user.email}</p>
                          <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 2, textTransform: "capitalize" }}>{plan ?? "free"} plan</p>
                        </div>
                        {[
                          { label: "Dashboard", href: "/dashboard" },
                        ].map(({ label, href }) => (
                          <a key={label} href={href} style={{ display: "block", padding: "10px 16px", fontSize: 14, color: "var(--black)", textDecoration: "none" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-50)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            {label}
                          </a>
                        ))}
                        {onHistory && (
                          <button onClick={() => { setDropdownOpen(false); onHistory(); }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 14, color: "var(--black)", background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-50)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            History
                          </button>
                        )}
                        {onBilling && (
                          <button onClick={() => { setDropdownOpen(false); onBilling(); }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 14, color: "var(--black)", background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-50)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            Billing
                          </button>
                        )}
                        <div style={{ borderTop: "var(--border)" }}>
                          <button onClick={() => { signOut().catch(() => {}); setDropdownOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 14, color: "var(--red)", background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--red-subtle)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  data-open-auth
                  onClick={() => setShowAuth(true)}
                  style={S.btn("ghost")}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--black)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--gray-200)")}
                >
                  Sign in
                </button>
              )}
              <button
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                style={S.btn("red")}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--red-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--red)")}
              >
                Get started
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={S.iconBtn}
              className="md:hidden"
            >
              {menuOpen ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            position: "fixed", top: 56, left: 0, right: 0, bottom: 0,
            background: "var(--white)", borderTop: "var(--border)",
            padding: 24, zIndex: 49,
            display: "flex", flexDirection: "column", gap: 2,
          }}>
            {/* Mobile search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search tools…"
                value={searchVal}
                onChange={handleSearch}
                style={{ width: "100%", height: 40, paddingLeft: 34, paddingRight: 12, fontSize: 14, border: "var(--border)", borderRadius: "var(--radius)", background: "var(--gray-50)", color: "var(--black)", outline: "none" }}
              />
            </div>
            {[
              { label: "Tools", href: "#tools" },
              { label: "Pricing", href: "#pricing" },
            ].map(({ label, href }) => (
              <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "12px 0", fontSize: 16, fontWeight: 500, color: "var(--black)", borderBottom: "var(--border)", textDecoration: "none" }}>
                {label}
              </a>
            ))}
            {user ? (
              <>
                <a href="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: "block", padding: "12px 0", fontSize: 16, fontWeight: 500, color: "var(--black)", borderBottom: "var(--border)", textDecoration: "none" }}>
                  Dashboard
                </a>
                <button onClick={() => { signOut().catch(() => {}); setMenuOpen(false); }} style={{ padding: "12px 0", fontSize: 16, fontWeight: 500, color: "var(--red)", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderBottom: "var(--border)" }}>
                  Sign out
                </button>
              </>
            ) : (
              <button data-open-auth onClick={() => { setShowAuth(true); setMenuOpen(false); }} style={{ padding: "12px 0", fontSize: 16, fontWeight: 500, color: "var(--black)", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderBottom: "var(--border)" }}>
                Sign in
              </button>
            )}
            <button onClick={() => setDark(!dark)} style={{ padding: "12px 0", fontSize: 14, color: "var(--gray-600)", background: "none", border: "none", textAlign: "left", cursor: "pointer", marginTop: 8 }}>
              {dark ? "Switch to light mode" : "Switch to dark mode"}
            </button>
          </div>
        )}
      </header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
