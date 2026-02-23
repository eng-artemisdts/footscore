import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  createdAt: number;
  durationMs: number;
  closing: boolean;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  success: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string;
  error: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string;
  warning: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string;
  info: (message: string, options?: Omit<ToastInput, "message" | "variant">) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function generateToastId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function variantStyles(variant: ToastVariant) {
  if (variant === "success") {
    return {
      bar: "bg-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
      title: "text-emerald-200",
    };
  }
  if (variant === "warning") {
    return {
      bar: "bg-yellow-300",
      badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",
      title: "text-yellow-200",
    };
  }
  if (variant === "info") {
    return {
      bar: "bg-cyan-300",
      badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
      title: "text-cyan-200",
    };
  }
  return {
    bar: "bg-red-300",
    badge: "bg-red-500/15 text-red-300 border-red-500/20",
    title: "text-red-200",
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const clearTimer = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) window.clearTimeout(t);
    timersRef.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 180);
    },
    [clearTimer],
  );

  const toast = useCallback(
    (input: ToastInput) => {
      const id = generateToastId();
      const variant = input.variant ?? "info";
      const durationMs = Math.max(1200, input.durationMs ?? (variant === "error" ? 5000 : 3200));
      const next: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        variant,
        createdAt: Date.now(),
        durationMs,
        closing: false,
      };

      setItems((prev) => [next, ...prev].slice(0, 5));
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  const clear = useCallback(() => {
    for (const id of timersRef.current.keys()) clearTimer(id);
    setItems([]);
  }, [clearTimer]);

  const value = useMemo<ToastContextValue>(() => {
    const withVariant = (variant: ToastVariant) => {
      return (message: string, options?: Omit<ToastInput, "message" | "variant">) =>
        toast({ ...options, message, variant });
    };
    return {
      toast,
      success: withVariant("success"),
      error: withVariant("error"),
      warning: withVariant("warning"),
      info: withVariant("info"),
      dismiss,
      clear,
    };
  }, [dismiss, toast, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-[100] pointer-events-none">
        <div className="flex flex-col gap-2 items-stretch sm:items-end">
          {items.map((t) => {
            const s = variantStyles(t.variant);
            return (
              <div
                key={t.id}
                className={[
                  "pointer-events-auto w-full sm:w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl shadow-black/40",
                  "transition-all duration-200",
                  t.closing ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100",
                ].join(" ")}
                role="status"
                aria-live="polite"
              >
                <div className={`h-1 w-full ${s.bar}`} />
                <div className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 px-2 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${s.badge}`}>
                    {t.variant === "success"
                      ? "Sucesso"
                      : t.variant === "warning"
                        ? "Atenção"
                        : t.variant === "info"
                          ? "Info"
                          : "Erro"}
                  </div>
                  <div className="flex-1 min-w-0">
                    {t.title && (
                      <div className={`text-[10px] font-black uppercase tracking-widest ${s.title}`}>
                        {t.title}
                      </div>
                    )}
                    <div className="text-sm font-medium text-white/70 leading-snug break-words">
                      {t.message}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white/80 transition flex items-center justify-center"
                    onClick={() => dismiss(t.id)}
                    aria-label="Fechar"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

