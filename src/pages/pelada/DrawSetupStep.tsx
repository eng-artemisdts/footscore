import React, { useMemo, useState } from "react";
import { Player } from "@/shared/types";
import { PlayerCard } from "@/shared/ui/PlayerCard";

type Props = {
  players: Player[];
  sport: "FUTEBOL";
  initialSelectedIds: string[];
  onCancel: () => void;
  onConfirm: (payload: { selectedIds: string[] }) => void;
};

export const DrawSetupStep: React.FC<Props> = ({
  players,
  sport,
  initialSelectedIds,
  onCancel,
  onConfirm,
}) => {
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => b.overall - a.overall);
  }, [players]);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedIds.length ? initialSelectedIds : players.map((p) => p.id),
  );

  const selectedCount = selectedIds.length;

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => setSelectedIds(players.map((p) => p.id));
  const clearAll = () => setSelectedIds([]);

  const canContinue = selectedCount >= 2;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onCancel} />

      <div className="relative w-full max-w-7xl max-h-[96vh] overflow-hidden rounded-[28px] sm:rounded-[44px] border border-white/10 bg-[#0c1220] shadow-2xl">
        <div className="px-5 sm:px-10 py-5 sm:py-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Antes do sorteio</div>
            <div className="text-2xl sm:text-4xl font-black tracking-tighter uppercase">Presença</div>
            <div className="mt-2 text-xs sm:text-sm text-white/40 font-bold">
              {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <button
              type="button"
              onClick={selectAll}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-black transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => onConfirm({ selectedIds })}
              className="px-6 py-2 rounded-xl bg-cyan-500 border border-cyan-400 text-[10px] font-black uppercase tracking-widest text-black hover:bg-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continuar →
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-10 overflow-y-auto custom-scrollbar max-h-[calc(96vh-120px)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Jogadores presentes</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/30">
                {players.length} no elenco
              </div>
            </div>

            <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {sortedPlayers.map((p) => {
                const active = selectedIds.includes(p.id);
                return (
                  <div key={p.id} className="relative">
                    <div
                      className={`absolute inset-0 rounded-[10%] border-4 transition ${
                        active ? "border-cyan-400/80" : "border-transparent"
                      }`}
                    />
                    <div
                      className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border transition ${
                        active
                          ? "bg-cyan-500 text-black border-cyan-300"
                          : "bg-black/50 text-white/40 border-white/10"
                      }`}
                      onClick={() => toggle(p.id)}
                    >
                      {active ? "✓" : ""}
                    </div>
                    <div className={active ? "" : "opacity-40"} onClick={() => toggle(p.id)}>
                      <PlayerCard sport={sport} player={p} />
                    </div>
                  </div>
                );
              })}
            </div>

            {!canContinue && (
              <div className="mt-6 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-bold">
                Selecione pelo menos 2 jogadores para sortear.
              </div>
            )}
          </div>
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 5px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        `}</style>
      </div>
    </div>
  );
};

