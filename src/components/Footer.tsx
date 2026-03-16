export function Footer() {
  const year = new Date().getFullYear();

  const COLS = {
    Product: ["All Tools", "Pricing", "API", "Changelog"],
    Company: ["About", "Blog", "Contact"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  };

  return (
    <footer style={{ borderTop: "var(--border)", background: "var(--white)", padding: "48px 0 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <a href="/" style={{ display: "inline-block", marginBottom: 12, textDecoration: "none" }}>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--black)" }}>
                PDF<span style={{ color: "var(--red)" }}>check</span>
              </span>
            </a>
            <p style={{ fontSize: 13, color: "var(--gray-400)", lineHeight: 1.6, maxWidth: 200 }}>
              Free online PDF tools. No signup, no watermark.
            </p>
          </div>

          {Object.entries(COLS).map(([heading, items]) => (
            <div key={heading}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--black)", marginBottom: 12, letterSpacing: "0.01em" }}>
                {heading}
              </p>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map(item => (
                  <li key={item}>
                    <a href="#" style={{ fontSize: 13, color: "var(--gray-400)", textDecoration: "none", transition: "color var(--transition)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--black)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--gray-400)")}
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "var(--border)", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
            © {year} PDFcheck · Built in Morocco 🇲🇦
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--gray-400)" }}>SSL secured</span>
            <span style={{ fontSize: 12, color: "var(--gray-400)" }}>GDPR compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
