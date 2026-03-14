import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { AuthModal } from "./AuthModal";

interface Props {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: Props) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch(e.target.value);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer select-none">
              <div className="bg-red-500 text-white font-black text-sm px-2 py-1 rounded">
                ✓
              </div>
              <span className="text-xl font-bold text-gray-800">
                <span className="text-red-500">PDF</span>check
              </span>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-md hidden sm:block">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search tools…"
                  value={searchVal}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600">
              <a href="#tools" className="px-3 py-1.5 rounded-md hover:bg-gray-100 transition">Tools</a>
              <a href="#features" className="px-3 py-1.5 rounded-md hover:bg-gray-100 transition">Features</a>
              <a href="#pricing" className="px-3 py-1.5 rounded-md hover:bg-gray-100 transition">Pricing</a>
            </nav>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden sm:block text-xs text-gray-500 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-500 px-3 py-1.5 rounded-md hover:bg-gray-50 transition"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-500 px-3 py-1.5 rounded-md hover:bg-gray-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Login
                </button>
              )}
              <button className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-full transition shadow-sm shadow-red-200">
                Get Premium
              </button>
              {/* Mobile menu */}
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  {menuOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden pb-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search tools…"
                value={searchVal}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {["Tools", "Features", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Sign Out ({user.email})
              </button>
            ) : (
              <button
                onClick={() => { setShowAuth(true); setMenuOpen(false); }}
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Login
              </button>
            )}
          </div>
        )}
      </header>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
