import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ToolCard } from "./components/ToolCard";
import { ToolModal } from "./components/ToolModal";
import { Features } from "./components/Features";
import { Pricing } from "./components/Pricing";
import { Footer } from "./components/Footer";
import { ToastContainer } from "./components/Toast";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { BillingModal } from "./components/BillingModal";
import { UpgradeModal } from "./components/UpgradeModal";
import { BatchModal } from "./components/BatchModal";
import { tools, categories, Tool } from "./data/tools";

export function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [batchTool, setBatchTool] = useState<Tool | null>(null);

  const [showHistory, setShowHistory] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOpenUpgrade = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      setUpgradeReason(reason);
      setShowUpgrade(true);
    };
    const handleOpenTool = (e: Event) => {
      const toolId = (e as CustomEvent<{ toolId?: string }>).detail?.toolId;
      if (toolId) {
        const tool = tools.find((t) => t.id === toolId);
        if (tool) setSelectedTool(tool);
      }
    };
    window.addEventListener("open-upgrade", handleOpenUpgrade as EventListener);
    window.addEventListener("open-tool", handleOpenTool as EventListener);
    return () => {
      window.removeEventListener("open-upgrade", handleOpenUpgrade as EventListener);
      window.removeEventListener("open-tool", handleOpenTool as EventListener);
    };
  }, []);

  const filtered = useMemo(() => {
    return tools.filter((t) => {
      const matchesCategory = activeCategory === "All" || t.category === activeCategory;
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const grouped = useMemo(() => {
    if (activeCategory !== "All" || searchQuery) {
      return { [activeCategory !== "All" ? activeCategory : "Results"]: filtered };
    }
    return categories.slice(1).reduce<Record<string, Tool[]>>((acc, cat) => {
      const items = tools.filter((t) => t.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    }, {});
  }, [filtered, activeCategory, searchQuery]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--white)", fontFamily: "var(--font)" }}>
      <ToastContainer />

      <Header
        onSearch={setSearchQuery}
        onHistory={() => setShowHistory(true)}
        onBilling={() => setShowBilling(true)}
      />

      <Hero />

      {/* Tools Section */}
      <section id="tools" style={{ borderBottom: "var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
          {/* Section header */}
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 8 }}>
            TOOLS
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "var(--black)" }}>
              Everything for your PDFs
            </h2>
            <button
              onClick={() => setBatchTool(tools.find((t) => t.id === "merge") ?? tools[0])}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                height: 36, padding: "0 16px", border: "var(--border)",
                borderRadius: "var(--radius)", background: "var(--white)",
                color: "var(--black)", fontSize: 13, fontWeight: 500,
                cursor: "pointer", fontFamily: "var(--font)",
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Batch process
            </button>
          </div>

          {/* Category Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 0, borderBottom: "var(--border)", marginBottom: 40 }}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat && !searchQuery;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
                  style={{
                    padding: "10px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: isActive ? "2px solid var(--red)" : "2px solid transparent",
                    marginBottom: -1,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--black)" : "var(--gray-400)",
                    cursor: "pointer",
                    transition: "color var(--transition)",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font)",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Tool groups */}
          {searchQuery && filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--gray-400)" }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--black)", marginBottom: 8 }}>
                No tools found for "{searchQuery}"
              </p>
              <p style={{ fontSize: 13 }}>Try a different keyword</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 48 }}>
                {activeCategory === "All" && !searchQuery && (
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--black)", letterSpacing: "0.01em" }}>{cat}</p>
                    <div style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
                    <span style={{ fontSize: 11, color: "var(--gray-400)" }}>{items.length} tools</span>
                  </div>
                )}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 1,
                  border: "var(--border)",
                  borderRadius: "var(--radius)",
                  overflow: "hidden",
                }}>
                  {items.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} onClick={setSelectedTool} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ borderBottom: "var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 16 }}>
            GET STARTED
          </p>
          <h2 style={{ fontSize: 40, fontWeight: 700, color: "var(--black)", marginBottom: 16, letterSpacing: "-0.02em" }}>
            Work smarter with PDFs
          </h2>
          <p style={{ fontSize: 16, color: "var(--gray-600)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
            Every tool you need, in one place. Free forever, with premium plans for power users.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
              style={{
                height: 44, padding: "0 24px",
                background: "var(--red)", color: "#fff",
                border: "none", borderRadius: "var(--radius)",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font)",
              }}
            >
              Start for free
            </button>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                height: 44, padding: "0 24px",
                background: "var(--white)", color: "var(--black)",
                border: "1px solid var(--black)", borderRadius: "var(--radius)",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font)",
              }}
            >
              View premium plans
            </button>
          </div>
        </div>
      </section>

      <Features />
      <Pricing />
      <Footer />

      {/* Modals */}
      {selectedTool && (
        <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
      )}
      {batchTool && (
        <BatchModal tool={batchTool} onClose={() => setBatchTool(null)} />
      )}
      <HistoryDrawer isOpen={showHistory} onClose={() => setShowHistory(false)} />
      <BillingModal isOpen={showBilling} onClose={() => setShowBilling(false)} />
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => { setShowUpgrade(false); setUpgradeReason(undefined); }}
        reason={upgradeReason}
      />
    </div>
  );
}
