export function Hero() {
  return (
    <section style={{ padding: "120px 24px 80px", borderBottom: "var(--border)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>

        {/* Eyebrow */}
        <p style={{
          fontSize: 13,
          color: "var(--gray-400)",
          letterSpacing: "0.05em",
          textTransform: "uppercase" as const,
          marginBottom: 24,
        }}>
          Free · No signup required · GDPR compliant
        </p>

        {/* H1 */}
        <h1 style={{
          fontSize: "clamp(40px, 6vw, 56px)",
          fontWeight: 700,
          color: "var(--black)",
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: 16,
        }}>
          The PDF toolkit that{" "}
          <span style={{ color: "var(--red)" }}>just works</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 16,
          color: "var(--gray-600)",
          lineHeight: 1.6,
          maxWidth: 520,
          margin: "0 auto 40px",
        }}>
          23 tools to merge, compress, convert and edit PDFs.
          Fast, free, and private.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          <a
            href="#tools"
            onClick={e => { e.preventDefault(); document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 44,
              padding: "0 20px",
              borderRadius: "var(--radius)",
              background: "var(--red)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              transition: "background var(--transition)",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--red-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--red)")}
          >
            Start for free
          </a>
          <a
            href="#tools"
            onClick={e => { e.preventDefault(); document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 44,
              padding: "0 20px",
              borderRadius: "var(--radius)",
              background: "var(--white)",
              color: "var(--black)",
              border: "1px solid var(--black)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              transition: "background var(--transition)",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--gray-50)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--white)")}
          >
            See all tools
          </a>
        </div>

        {/* Social proof */}
        <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
          50,000+ users · 4.9/5 rating · No watermarks
        </p>

      </div>
    </section>
  );
}
