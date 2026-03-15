import { useEffect, useRef, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { toastBus, type Toast } from "../lib/toast";

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 5;

const TYPE_CONFIG = {
  success: { icon: CheckCircle, color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
  error:   { icon: AlertCircle, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  info:    { icon: Info,         color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  warning: { icon: AlertTriangle,color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
} as const;

interface ToastItem extends Toast { visible: boolean; }

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = TYPE_CONFIG[item.type];
  const Icon = cfg.icon;
  const duration = item.duration ?? DEFAULT_DURATION;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(item.id), duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [item.id, duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 8,
        padding: "12px 14px",
        maxWidth: 360,
        width: "100%",
        boxShadow: "var(--shadow-md)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        opacity: item.visible ? 1 : 0,
        transform: item.visible ? "translateX(0)" : "translateX(16px)",
      }}
    >
      <Icon size={16} strokeWidth={2} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
      <p style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: "var(--color-text-primary)" }}>
        {item.message}
      </p>
      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 4,
          border: "none",
          background: "transparent",
          color: "var(--color-text-muted)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <X size={12} strokeWidth={2} />
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          borderRadius: "0 0 0 8px",
          background: cfg.color,
          opacity: 0.4,
          animation: `shrink ${duration}ms linear forwards`,
          width: "100%",
        }}
      />
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (incoming: Toast) => {
      setToasts((prev) => {
        const trimmed = prev.slice(-(MAX_TOASTS - 1));
        return [...trimmed, { ...incoming, visible: true }];
      });
    };
    toastBus.subscribe(handler);
    return () => toastBus.unsubscribe(handler);
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((item) => (
        <div key={item.id} style={{ pointerEvents: "auto", position: "relative" }}>
          <ToastItem item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
