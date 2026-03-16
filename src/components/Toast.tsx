import { useEffect, useRef, useState } from "react";
import { toastBus, type Toast } from "../lib/toast";

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 5;

const typeConfig: Record<Toast["type"], { bar: string; icon: React.ReactNode }> = {
  success: {
    bar: "var(--black)",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: "var(--black)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    bar: "var(--red)",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: "var(--red)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bar: "var(--gray-400)",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: "var(--gray-400)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bar: "var(--red)",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24" style={{ color: "var(--red)" }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
};

interface ToastItem extends Toast { visible: boolean; }

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const config = typeConfig[item.type];
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
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--white)",
        border: "var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        maxWidth: 360,
        width: "100%",
        overflow: "hidden",
        transition: "transform 300ms ease, opacity 300ms ease",
        transform: item.visible ? "translateY(0)" : "translateY(-8px)",
        opacity: item.visible ? 1 : 0,
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: 2,
          background: config.bar,
          borderRadius: 1,
          animation: `shrink ${duration}ms linear forwards`,
          width: "100%",
        }}
      />

      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        {config.icon}
      </div>

      <p style={{ fontSize: 13, fontWeight: 500, color: "var(--black)", flex: 1, lineHeight: 1.5, paddingRight: 8 }}>
        {item.message}
      </p>

      <button
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0, color: "var(--gray-400)", background: "none",
          border: "none", cursor: "pointer", padding: 2, marginTop: 1,
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
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
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 350);
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
        <div key={item.id} style={{ pointerEvents: "auto" }}>
          <ToastItem item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
