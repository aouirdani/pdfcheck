import { useEffect, useRef, useState } from "react";
import { toastBus, type Toast } from "../lib/toast";

const DEFAULT_DURATION = 3500;
const MAX_TOASTS = 5;

const typeStyles: Record<Toast["type"], { bar: string; icon: JSX.Element; bg: string; border: string; text: string }> = {
  success: {
    bg: "bg-white",
    border: "border-green-200",
    bar: "bg-green-500",
    text: "text-green-700",
    icon: (
      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    bar: "bg-red-500",
    text: "text-red-700",
    icon: (
      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    bg: "bg-white",
    border: "border-blue-200",
    bar: "bg-blue-500",
    text: "text-blue-700",
    icon: (
      <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    bg: "bg-white",
    border: "border-yellow-200",
    bar: "bg-yellow-400",
    text: "text-yellow-700",
    icon: (
      <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
};

interface ToastItem extends Toast {
  visible: boolean;
}

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const styles = typeStyles[item.type];
  const duration = item.duration ?? DEFAULT_DURATION;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start the auto-dismiss timer
  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(item.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, duration, onDismiss]);

  return (
    <div
      className={`relative flex items-start gap-3 ${styles.bg} border ${styles.border} rounded-xl shadow-lg px-4 py-3 max-w-sm w-full overflow-hidden
        transition-all duration-300 ease-out
        ${item.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Colored progress bar at bottom */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${styles.bar} animate-[shrink_var(--dur)_linear_forwards]`}
        style={{ "--dur": `${duration}ms`, width: "100%" } as React.CSSProperties}
      />

      {styles.icon}

      <p className={`text-sm font-medium ${styles.text} flex-1 leading-snug pr-2`}>
        {item.message}
      </p>

      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
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
        // Keep only the last MAX_TOASTS - 1 so we have room for the new one
        const trimmed = prev.slice(-(MAX_TOASTS - 1));
        return [...trimmed, { ...incoming, visible: true }];
      });
    };

    toastBus.subscribe(handler);
    return () => toastBus.unsubscribe(handler);
  }, []);

  const dismiss = (id: string) => {
    // First mark invisible (triggers CSS transition), then remove
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, visible: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 350);
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Notifications"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto">
          <ToastItem item={item} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
