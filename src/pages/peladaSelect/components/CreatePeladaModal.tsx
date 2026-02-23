import React, { useState } from "react";
import { Pelada } from "@/shared/types";
import { generateId } from "@/shared/utils";

interface CreatePeladaModalProps {
  onClose: () => void;
  onCreate: (pelada: Pelada) => Promise<void>;
  userId: string;
}

export const CreatePeladaModal: React.FC<CreatePeladaModalProps> = ({
  onClose,
  onCreate,
  userId,
}) => {
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState<"FUTEBOL">("FUTEBOL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sportOptions = [
    { id: "FUTEBOL" as const, label: "Futebol", icon: "⚽", enabled: true },
    { id: "FUTSAL" as const, label: "Futsal", icon: "🥅", enabled: false },
    { id: "VOLEI" as const, label: "Vôlei", icon: "🏐", enabled: false },
  ];

  const createPeladaId = () => {
    const maybeUuid = globalThis.crypto?.randomUUID?.();
    return maybeUuid || generateId();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Digite um nome para a pelada.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const pelada: Pelada = {
        id: createPeladaId(),
        name: trimmed,
        sport: sportId,
        userId,
        createdAt: new Date().toISOString(),
      };
      await onCreate(pelada);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar pelada.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-300"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-[#0c1220] border border-white/10 rounded-[30px] sm:rounded-[40px] w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-white">
            Nova pelada
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-widest text-center">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">
              Esporte
            </label>
            <div className="grid grid-cols-3 gap-3">
              {sportOptions.map((opt) => {
                const selected = sportId === "FUTEBOL" && opt.id === "FUTEBOL";
                const disabled = !opt.enabled;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={disabled || loading}
                    onClick={() => {
                      if (!opt.enabled) return;
                      setSportId("FUTEBOL");
                      setError(null);
                    }}
                    className={[
                      "py-4 rounded-2xl border transition-all active:scale-[0.99] flex flex-col items-center justify-center gap-1",
                      disabled || loading
                        ? "bg-black/30 border-white/5 text-white/25 cursor-not-allowed opacity-60"
                        : selected
                          ? "bg-cyan-500/20 border-cyan-500/30 text-white"
                          : "bg-black/40 border-white/5 text-white/60 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="text-2xl leading-none">{opt.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-1">
              Nome da pelada
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ex: Pelada do Condomínio"
              className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-6 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-white/10"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-white text-black py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-cyan-400 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                "Criar pelada"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
