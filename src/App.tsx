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
import { tools, categories, Tool } from "./data/tools";

export function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  // Overlay state
  const [showHistory, setShowHistory] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  // Global event listeners
  useEffect(() => {
    const handleOpenAuth = () => {
      // AuthModal is controlled inside Header; dispatch a synthetic click on the Login button
      // by emitting a custom event that Header listens to — simpler approach: dispatch a
      // header-level event that Header picks up. Since Header manages its own auth modal,
      // we trigger the built-in window event and let Header handle it.
      const btn = document.querySelector<HTMLButtonElement>("[data-open-auth]");
      if (btn) btn.click();
    };

    const handleOpenUpgrade = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      setUpgradeReason(reason);
      setShowUpgrade(true);
    };

    window.addEventListener("open-auth", handleOpenAuth);
    window.addEventListener("open-upgrade", handleOpenUpgrade as EventListener);

    return () => {
      window.removeEventListener("open-auth", handleOpenAuth);
      window.removeEventListener("open-upgrade", handleOpenUpgrade as EventListener);
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

  // Group by category for display
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
    <div className="min-h-screen bg-white font-sans">
      {/* Global toast notifications */}
      <ToastContainer />

      <Header
        onSearch={setSearchQuery}
        onHistory={() => setShowHistory(true)}
        onBilling={() => setShowBilling(true)}
      />
      <Hero />

      {/* Tools Section */}
      <section id="tools" className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition border ${
                  activeCategory === cat && !searchQuery
                    ? "bg-red-500 text-white border-red-500 shadow-sm shadow-red-200"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tool groups */}
          {searchQuery && filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="font-semibold text-lg">No tools found for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try a different keyword</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-12">
                {activeCategory === "All" && !searchQuery && (
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-lg font-extrabold text-gray-800">{cat}</h2>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400 font-medium">{items.length} tools</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {items.map((tool) => (
                    <ToolCard key={tool.id} tool={tool} onClick={setSelectedTool} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Banner CTA */}
      <section className="bg-gradient-to-r from-red-500 to-rose-600 py-14 px-4 text-center text-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-3">Ready to work smarter with PDFs?</h2>
          <p className="text-red-100 text-sm mb-7 max-w-md mx-auto">
            Join over 100 million users who trust PDFcheck for all their PDF needs. Free to use, forever.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white text-red-600 font-bold px-7 py-3 rounded-full hover:bg-red-50 transition shadow-md text-sm"
            >
              Start Using Tools
            </button>
            <button
              onClick={() => setShowUpgrade(true)}
              className="border-2 border-white/50 hover:border-white text-white font-semibold px-7 py-3 rounded-full transition text-sm"
            >
              Get Premium
            </button>
          </div>
        </div>
      </section>

      <Features />
      <Pricing />
      <Footer />

      {/* Tool Modal */}
      {selectedTool && (
        <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
      )}

      {/* Overlays */}
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
