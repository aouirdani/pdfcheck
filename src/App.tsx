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

const CATEGORY_ICONS: Record<string, string> = {
  All: "✦",
  Organize: "📄",
  "Convert to PDF": "⬆️",
  "Convert from PDF": "⬇️",
  "Edit PDF": "✏️",
  Security: "🔒",
};

export function App() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [batchTool, setBatchTool] = useState<Tool | null>(null);

  // Overlay state
  const [showHistory, setShowHistory] = useState(false);
  const [showBilling, setShowBilling] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  // Global event listeners
  useEffect(() => {
    const handleOpenUpgrade = (e: Event) => {
      const reason = (e as CustomEvent<{ reason?: string }>).detail?.reason;
      setUpgradeReason(reason);
      setShowUpgrade(true);
    };

    // Listen for tool open from Dashboard quick actions
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0F0F0F] font-sans transition-colors">
      <ToastContainer />

      <Header
        onSearch={setSearchQuery}
        onHistory={() => setShowHistory(true)}
        onBilling={() => setShowBilling(true)}
      />

      <Hero />

      {/* Tools Section */}
      <section id="tools" className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">PDF Tools</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{tools.length} tools · All free to use</p>
            </div>
            {/* Batch process button */}
            <button
              onClick={() => setBatchTool(tools.find((t) => t.id === "merge") ?? tools[0])}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200/40 dark:shadow-indigo-900/40 hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5 transition-all self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Batch Process
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {categories.map((cat) => {
              const isActive = activeCategory === cat && !searchQuery;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setSearchQuery(""); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/50"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <span className="text-base leading-none">{CATEGORY_ICONS[cat] ?? ""}</span>
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Tool groups */}
          {searchQuery && filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-gray-600">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="font-semibold text-lg text-gray-600 dark:text-gray-400">No tools found for "{searchQuery}"</p>
              <p className="text-sm mt-1">Try a different keyword</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-12">
                {activeCategory === "All" && !searchQuery && (
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-lg">{CATEGORY_ICONS[cat] ?? "📄"}</span>
                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">{cat}</h2>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                    <span className="text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                      {items.length} tools
                    </span>
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
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700" />
        <div className="absolute inset-0 animate-gradient" style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(139,92,246,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.3) 0%, transparent 60%)"
        }} />
        <div className="relative max-w-2xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs px-3 py-1.5 rounded-full mb-6 font-medium">
            ✦ Join 100 million users
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
            Work smarter with PDFs
          </h2>
          <p className="text-indigo-200 text-base mb-8 max-w-md mx-auto leading-relaxed">
            Every tool you need, in one place. Free forever, with premium plans for power users.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-white text-indigo-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-indigo-50 transition shadow-xl text-sm"
            >
              Start for free →
            </button>
            <button
              onClick={() => setShowUpgrade(true)}
              className="border-2 border-white/40 hover:border-white text-white font-semibold px-8 py-3.5 rounded-2xl transition text-sm"
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
