import { useAuth } from "../contexts/AuthContext";
import { usePlan } from "../hooks/usePlan";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

const proFeatures = [
  { icon: "∞", label: "Unlimited daily tools" },
  { icon: "1GB", label: "Files up to 1 GB" },
  { icon: "⚡", label: "Priority processing" },
  { icon: "🚫", label: "No advertisements" },
  { icon: "📥", label: "Batch downloads" },
  { icon: "🔒", label: "Advanced security options" },
];

export function UpgradeModal({ isOpen, onClose, reason }: Props) {
  const { user } = useAuth();
  const { plan, jobsToday, isPro } = usePlan();

  if (!isOpen) return null;

  const freeLimit = 5;
  const isAnon = !user;

  const handleGetPremium = () => {
    onClose();
    // Scroll to pricing section
    const pricingEl = document.getElementById("pricing");
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignIn = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("open-auth"));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 px-6 py-8 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-extrabold mb-1">Upgrade to Pro</h2>

          {reason && (
            <p className="text-orange-100 text-sm">{reason}</p>
          )}

          {!isAnon && !isPro && (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              You&apos;ve used {jobsToday}/{freeLimit} free tools today
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          {isAnon ? (
            /* Not logged in — prompt to sign in first */
            <div className="text-center mb-4">
              <p className="text-gray-600 text-sm mb-4">
                Sign in to track your usage and unlock Pro features.
              </p>
              <button
                onClick={handleSignIn}
                className="w-full py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition shadow-sm shadow-red-200"
              >
                Sign In / Create Account
              </button>
            </div>
          ) : (
            <>
              {/* Free vs Pro comparison */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* Free */}
                <div className="border border-gray-200 rounded-2xl p-4">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Free</div>
                  <div className="text-xl font-extrabold text-gray-800 mb-3">$0</div>
                  <ul className="space-y-1.5 text-xs text-gray-500">
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> 5 tools per day
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> Up to 100 MB files
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-red-400">✗</span> Ads shown
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-red-400">✗</span> Standard speed
                    </li>
                  </ul>
                </div>

                {/* Pro */}
                <div className="border-2 border-orange-400 rounded-2xl p-4 bg-orange-50 relative">
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                      RECOMMENDED
                    </span>
                  </div>
                  <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Pro</div>
                  <div className="text-xl font-extrabold text-gray-800 mb-3">€9.99<span className="text-sm font-medium text-gray-400">/mo</span></div>
                  <ul className="space-y-1.5 text-xs text-gray-600">
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> Unlimited tools
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> Up to 1 GB files
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> No ads
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-green-500">✓</span> Priority speed
                    </li>
                  </ul>
                </div>
              </div>

              {/* Pro feature highlights */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {proFeatures.map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-1 text-center bg-gray-50 rounded-xl p-2.5">
                    <span className="text-base">{f.icon}</span>
                    <span className="text-[10px] font-medium text-gray-600 leading-tight">{f.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {!isAnon && (
            <button
              onClick={handleGetPremium}
              className="w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-sm transition shadow-md shadow-orange-200"
            >
              Get Pro — €9.99/mo
            </button>
          )}

          <p className="text-center text-xs text-gray-400 mt-3">
            Cancel anytime · No hidden fees · Instant access
          </p>

          {plan === "free" && !isAnon && (
            <button
              onClick={onClose}
              className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 transition py-1"
            >
              Continue with free plan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
