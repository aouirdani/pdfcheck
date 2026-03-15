import { useEffect, useRef } from "react";

const FLOATING_CARDS = [
  { icon: "🔀", label: "Merge PDF", color: "from-red-400 to-rose-500", delay: "0s" },
  { icon: "✂️", label: "Split PDF", color: "from-orange-400 to-amber-500", delay: "0.5s" },
  { icon: "⚡", label: "Compress", color: "from-green-400 to-emerald-500", delay: "1s" },
  { icon: "🔒", label: "Protect", color: "from-indigo-400 to-violet-500", delay: "1.5s" },
  { icon: "🔄", label: "Convert", color: "from-blue-400 to-cyan-500", delay: "0.8s" },
];

const TRUST_BADGES = [
  { value: "100M+", label: "Happy Users" },
  { value: "20+", label: "PDF Tools" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9★", label: "Rating" },
];

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79, 70, 229, ${p.alpha})`;
        ctx.fill();
      });
      // Draw connecting lines
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.15 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 py-20 px-4">
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />

      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-[120px] opacity-20 -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500 rounded-full filter blur-[120px] opacity-20 translate-y-1/2" />

      <div className="relative max-w-6xl mx-auto text-center">
        {/* Trust badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold px-4 py-2 rounded-full mb-8 animate-fade-up">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Trusted by 100M+ users worldwide · GDPR Compliant
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-fade-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          The smartest{" "}
          <span className="relative inline-block">
            <span className="gradient-text bg-gradient-to-r from-indigo-300 to-violet-300" style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              PDF toolkit
            </span>
            <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 200 6" fill="none" preserveAspectRatio="none">
              <path d="M0 3 Q50 0 100 3 Q150 6 200 3" stroke="url(#u)" strokeWidth="2.5" fill="none">
                <defs><linearGradient id="u" x1="0" x2="1"><stop stopColor="#818CF8"/><stop offset="1" stopColor="#A78BFA"/></linearGradient></defs>
              </path>
            </svg>
          </span>
        </h1>

        <p className="text-indigo-200 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          Merge, split, compress, convert and secure PDFs instantly.
          All tools free — no installation, no signup required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-14 animate-fade-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <a
            href="#tools"
            className="group bg-white text-indigo-700 font-bold px-8 py-4 rounded-2xl shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all text-sm"
          >
            Start for free
            <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
          </a>
          <a
            href="#tools"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-sm"
          >
            See all 20+ tools
          </a>
        </div>

        {/* Floating tool cards */}
        <div className="flex flex-wrap justify-center gap-3 mb-14 animate-fade-up" style={{ animationDelay: "0.4s", animationFillMode: "both" }}>
          {FLOATING_CARDS.map((card) => (
            <div
              key={card.label}
              className="animate-float flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-2xl text-white hover:bg-white/20 transition-all cursor-pointer"
              style={{ animationDelay: card.delay }}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-sm shadow-sm`}>
                {card.icon}
              </div>
              <span className="text-sm font-medium">{card.label}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="inline-flex flex-wrap justify-center gap-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-8 py-5 animate-fade-up" style={{ animationDelay: "0.5s", animationFillMode: "both" }}>
          {TRUST_BADGES.map((b, i) => (
            <div key={b.label} className="text-center flex items-center gap-4">
              <div>
                <div className="text-2xl font-black text-white">{b.value}</div>
                <div className="text-xs text-indigo-300 mt-0.5">{b.label}</div>
              </div>
              {i < TRUST_BADGES.length - 1 && (
                <div className="w-px h-8 bg-white/20 hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="mt-12 flex flex-col items-center gap-1 text-white/40 text-xs animate-fade-up" style={{ animationDelay: "0.6s", animationFillMode: "both" }}>
          <span>Scroll to explore</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
