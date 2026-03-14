// Lightweight toast event bus — no external dependencies

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastCallback = (toast: Toast) => void;

const callbacks = new Set<ToastCallback>();

export const toastBus = {
  emit(toast: Toast) {
    callbacks.forEach((cb) => cb(toast));
  },
  subscribe(cb: ToastCallback) {
    callbacks.add(cb);
  },
  unsubscribe(cb: ToastCallback) {
    callbacks.delete(cb);
  },
};

export function toast(
  message: string,
  type: ToastType = "info",
  duration?: number
): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  toastBus.emit({ id, message, type, duration });
}
