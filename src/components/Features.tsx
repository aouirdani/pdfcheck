const STEPS = [
  { n: "01", title: "Upload", desc: "Drop your PDF or click to browse. Any browser, any device." },
  { n: "02", title: "Process", desc: "Your file is processed instantly — locally when possible." },
  { n: "03", title: "Download", desc: "Get your file immediately. No account, no watermark." },
];

export function Features() {
  return (
    <section style={{ borderBottom: "var(--border)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--gray-400)", marginBottom: 8 }}>
          HOW IT WORKS
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--black)", marginBottom: 48 }}>
          Three steps. That's it.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", borderTop: "var(--border)" }}>
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              style={{
                padding: "32px 0",
                paddingRight: i < STEPS.length - 1 ? 40 : 0,
                paddingLeft: i > 0 ? 40 : 0,
                borderLeft: i > 0 ? "var(--border)" : "none",
              }}
            >
              <p style={{ fontSize: 32, fontWeight: 700, color: "var(--red)", marginBottom: 12, letterSpacing: "-0.03em" }}>
                {step.n}
              </p>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--black)", marginBottom: 8 }}>
                {step.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--gray-600)", lineHeight: 1.6 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
