import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ConfirmVariant = "default" | "danger";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

type PendingConfirm = {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback((value: boolean) => {
    setPending((p) => {
      if (p) p.resolve(value);
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (pending) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      setPending({ options, resolve });
      window.setTimeout(() => confirmBtnRef.current?.focus(), 0);
    });
  }, [pending]);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  const o = pending?.options ?? null;
  const title = (o?.title ?? "").trim() || "Confirmação";
  const message = (o?.message ?? "").trim();
  const confirmText = (o?.confirmText ?? "").trim() || "Confirmar";
  const cancelText = (o?.cancelText ?? "").trim() || "Cancelar";
  const variant: ConfirmVariant = o?.variant ?? "default";
  const confirmClasses =
    variant === "danger"
      ? "bg-red-500 text-black hover:bg-red-400"
      : "bg-cyan-500 text-black hover:bg-cyan-400";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onKeyDown={(e) => {
            if (e.key === "Escape") close(false);
          }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={() => close(false)}
            aria-label="Fechar"
          />

          <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-black/70 backdrop-blur-3xl shadow-2xl shadow-black/50 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xl" aria-hidden>
                    {variant === "danger" ? "⚠️" : "❓"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-white/40">
                    {title}
                  </div>
                  <div className="mt-1 text-sm font-medium text-white/70 leading-snug break-words">
                    {message}
                  </div>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 text-[10px] font-black uppercase tracking-widest transition"
                  onClick={() => close(false)}
                >
                  {cancelText}
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  className={`px-4 py-2.5 rounded-2xl ${confirmClasses} text-[10px] font-black uppercase tracking-widest transition`}
                  onClick={() => close(true)}
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

