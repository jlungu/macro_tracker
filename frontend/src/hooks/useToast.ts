import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(newToasts: Toast[]) {
  toasts = newToasts;
  listeners.forEach((l) => l(toasts));
}

export function toast(opts: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  dispatch([...toasts, { ...opts, id }]);
  setTimeout(() => {
    dispatch(toasts.filter((t) => t.id !== id));
  }, 3500);
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(toasts);

  const subscribe = useCallback((setter: (t: Toast[]) => void) => {
    listeners.push(setter);
    return () => {
      listeners = listeners.filter((l) => l !== setter);
    };
  }, []);

  useState(() => {
    const unsub = subscribe(setState);
    return unsub;
  });

  return { toasts: state, toast };
}
