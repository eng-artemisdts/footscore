import React, { useMemo, useState } from "react";
import { PeladaEventConfirmation, Player } from "@/shared/types";
import { generateId } from "@/shared/utils";
import { usePeladaAgenda } from "@/pages/pelada/hooks/usePeladaAgenda";
import { useToast } from "@/shared/ui/ToastProvider";
import { DatePicker } from "@/shared/ui/DatePicker";
import { TimePicker } from "@/shared/ui/TimePicker";
import { NumberStepper } from "@/shared/ui/NumberStepper";

export function AgendaTab(props: {
  peladaId: string;
  userId: string;
  isAdmin: boolean;
  players: Player[];
  onStartDrawWithPlayerIds: (playerIds: string[]) => void;
}) {
  const { peladaId, userId, isAdmin, players, onStartDrawWithPlayerIds } =
    props;
  const toast = useToast();
  const agenda = usePeladaAgenda({ peladaId, userId, isAdmin });

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [minPeople, setMinPeople] = useState(10);
  const [creating, setCreating] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMinPeople, setEditMinPeople] = useState(10);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [expandedConfirmedByEventId, setExpandedConfirmedByEventId] = useState<
    Record<string, boolean>
  >({});

  const playersByUserId = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) {
      if (p.userId) map.set(p.userId, p);
    }
    return map;
  }, [players]);

  const formatDateTime = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso.replace("T", " ").slice(0, 16);
    }
  };

  const formatShort = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso.replace("T", " ").slice(0, 16);
    }
  };

  const pad2 = (n: number) => String(n).padStart(2, "0");

  const isoToLocalYmd = (iso: string) => {
    try {
      const dt = new Date(iso);
      if (!Number.isFinite(dt.getTime())) return "";
      return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    } catch {
      return "";
    }
  };

  const isoToLocalHm = (iso: string) => {
    try {
      const dt = new Date(iso);
      if (!Number.isFinite(dt.getTime())) return "";
      return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const buildIsoFromParts = (d: string, t: string) => {
    const dd = (d || "").trim();
    const tt = (t || "").trim();
    if (!dd || !tt) return null;
    const dt = new Date(`${dd}T${tt}:00`);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt.toISOString();
  };

  const buildStartsAtIso = () => {
    const d = date.trim();
    const t = time.trim();
    if (!d || !t) return null;
    const dt = new Date(`${d}T${t}:00`);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt.toISOString();
  };

  const handleCreate = async () => {
    if (creating) return;
    const startsAt = buildStartsAtIso();
    const loc = location.trim();
    const min = Math.max(2, Math.min(100, Number(minPeople) || 10));
    if (!startsAt) {
      toast.warning("Informe data e horário válidos.", {
        title: "Campos obrigatórios",
      });
      return;
    }
    if (!loc) {
      toast.warning("Informe o local.", { title: "Campos obrigatórios" });
      return;
    }
    setCreating(true);
    try {
      await agenda.createEvent({
        id: generateId(),
        startsAt,
        location: loc,
        minPeople: min,
      });
      setDate("");
      setTime("");
      setLocation("");
      setMinPeople(10);
      toast.success("Pelada agendada com sucesso.", { title: "Agenda" });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível agendar.",
        { title: "Falha ao agendar" },
      );
    } finally {
      setCreating(false);
    }
  };

  const paymentBlocked = agenda.paymentStatus === "IRREGULAR";

  return (
    <section className="animate-in fade-in slide-in-from-top-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 sm:mb-12 border-b border-white/5 pb-8 sm:pb-12">
        <div className="flex-1">
          <h2 className="text-3xl sm:text-4xl font-black mb-2 tracking-tighter uppercase">
            Agenda
          </h2>
          <p className="text-white/30 text-xs sm:text-sm font-medium leading-relaxed max-w-2xl">
            Confirme presença nas próximas peladas e gere sorteios com base nos
            confirmados.
          </p>
          {paymentBlocked && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest text-yellow-300">
              Pagamento irregular: confirmação bloqueada
            </div>
          )}
          {!agenda.loading && agenda.error && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-300">
              {agenda.error}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => agenda.refresh()}
            disabled={agenda.loading}
            className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-50"
          >
            {agenda.loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[28px] sm:rounded-[40px] p-6 sm:p-8 mb-8 sm:mb-10">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">
            Novo agendamento
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="sm:col-span-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                Data
              </label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                Horário
              </label>
              <TimePicker value={time} onChange={setTime} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                Local
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Arena Central"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                Mínimo
              </label>
              <NumberStepper
                value={minPeople}
                onChange={setMinPeople}
                min={2}
                max={100}
                step={1}
              />
            </div>
            <div className="sm:col-span-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">
                Prévia
              </div>
              <div className="px-4 py-3 rounded-2xl bg-black/30 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                {(() => {
                  const iso = buildStartsAtIso();
                  if (!iso || !location.trim())
                    return "Preencha data, horário e local";
                  return `${formatShort(iso)} · ${location.trim()} · mínimo ${Math.max(2, Math.min(100, Number(minPeople) || 10))}`;
                })()}
              </div>
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-3 rounded-2xl bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition disabled:opacity-60"
              >
                {creating ? "Agendando..." : "Agendar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {agenda.events.length === 0 && !agenda.loading ? (
        <div className="py-16 sm:py-24 text-center border-2 border-dashed border-white/10 rounded-[30px] sm:rounded-[40px] bg-black/20">
          <div className="text-6xl sm:text-7xl opacity-15 mb-6">📅</div>
          <div className="text-xl sm:text-2xl font-black tracking-tighter uppercase text-white/20 mb-3">
            Nenhuma pelada agendada
          </div>
          <div className="text-white/35 text-sm font-medium max-w-md mx-auto">
            {isAdmin
              ? "Crie um agendamento acima para liberar confirmações."
              : "Aguarde o admin agendar a próxima pelada."}
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {agenda.events.map((e) => {
            const confs = (agenda.confirmationsByEventId.get(e.id) ??
              []) as PeladaEventConfirmation[];
            const confirmed = confs.filter((c) => c.status === "CONFIRMED");
            const confirmedUserIds = Array.from(
              new Set(confirmed.map((c) => c.userId)),
            );
            const confirmedCount = confirmedUserIds.length;
            const quorumOk = confirmedCount >= e.minPeople;
            const mine = agenda.myConfirmationByEventId.get(e.id);
            const iConfirmed = mine?.status === "CONFIRMED";

            const isEditing = editingEventId === e.id;

            return (
              <div
                key={e.id}
                className="bg-white/[0.03] border border-white/10 rounded-[28px] sm:rounded-[40px] p-6 sm:p-8"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="min-w-0">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                      {formatDateTime(e.startsAt)}
                    </div>
                    <div className="mt-1 text-2xl sm:text-3xl font-black tracking-tighter uppercase text-white truncate">
                      {e.location}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                        Confirmados{" "}
                        <span
                          className={
                            quorumOk ? "text-emerald-300" : "text-yellow-300"
                          }
                        >
                          {confirmedCount}
                        </span>
                        <span className="text-white/20">/{e.minPeople}</span>
                      </div>
                      <div className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                        {quorumOk ? (
                          <span className="text-emerald-300">Quórum ok</span>
                        ) : (
                          <span className="text-yellow-300">
                            Aguardando quórum
                          </span>
                        )}
                      </div>
                      {iConfirmed && (
                        <div className="px-3 py-2 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                          Você confirmou
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <button
                      type="button"
                      disabled={paymentBlocked || agenda.loading}
                      onClick={async () => {
                        try {
                          await agenda.setMyConfirmation({
                            peladaEventId: e.id,
                            status: "CONFIRMED",
                          });
                          toast.success("Presença confirmada.", {
                            title: "Agenda",
                          });
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Não foi possível confirmar.",
                            { title: "Falha" },
                          );
                        }
                      }}
                      className={[
                        "px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition border",
                        iConfirmed
                          ? "bg-white/5 border-white/10 text-white/30"
                          : "bg-cyan-500 border-cyan-400 text-black hover:bg-cyan-400",
                        paymentBlocked ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      disabled={!iConfirmed || agenda.loading}
                      onClick={async () => {
                        try {
                          await agenda.setMyConfirmation({
                            peladaEventId: e.id,
                            status: "CANCELLED",
                          });
                          toast.info("Confirmação removida.", {
                            title: "Agenda",
                          });
                        } catch (err) {
                          toast.error(
                            err instanceof Error
                              ? err.message
                              : "Não foi possível cancelar.",
                            { title: "Falha" },
                          );
                        }
                      }}
                      className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={players.length < 2}
                      onClick={() =>
                        onStartDrawWithPlayerIds(
                          Array.from(new Set(players.map((p) => p.id))),
                        )
                      }
                      className="px-6 py-3 rounded-full bg-indigo-600/30 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest text-indigo-200 hover:bg-indigo-500/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Sortear Times
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          disabled={agenda.loading || deletingEventId === e.id}
                          onClick={() => {
                            if (isEditing) {
                              setEditingEventId(null);
                              return;
                            }
                            setEditingEventId(e.id);
                            setEditDate(isoToLocalYmd(e.startsAt));
                            setEditTime(isoToLocalHm(e.startsAt));
                            setEditLocation(e.location);
                            setEditMinPeople(e.minPeople);
                          }}
                          className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isEditing ? "Fechar edição" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={
                            agenda.loading ||
                            deletingEventId === e.id ||
                            savingEdit
                          }
                          onClick={async () => {
                            if (
                              typeof window !== "undefined" &&
                              !window.confirm(
                                "Remover este agendamento? As confirmações também serão apagadas.",
                              )
                            )
                              return;
                            setDeletingEventId(e.id);
                            try {
                              await agenda.deleteEvent(e.id);
                              if (editingEventId === e.id)
                                setEditingEventId(null);
                              toast.success("Agendamento removido.", {
                                title: "Agenda",
                              });
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Não foi possível remover.",
                                { title: "Falha" },
                              );
                            } finally {
                              setDeletingEventId((prev) =>
                                prev === e.id ? null : prev,
                              );
                            }
                          }}
                          className="px-6 py-3 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/20 hover:border-red-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingEventId === e.id
                            ? "Removendo..."
                            : "Excluir"}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isAdmin && isEditing && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">
                      Editar agendamento
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="sm:col-span-1">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                          Data
                        </label>
                        <DatePicker
                          value={editDate}
                          onChange={setEditDate}
                          disabled={savingEdit}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                          Horário
                        </label>
                        <TimePicker
                          value={editTime}
                          onChange={setEditTime}
                          disabled={savingEdit}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                          Local
                        </label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(ev) => setEditLocation(ev.target.value)}
                          disabled={savingEdit}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-cyan-500/50 disabled:opacity-60"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">
                          Mínimo
                        </label>
                        <NumberStepper
                          value={editMinPeople}
                          onChange={setEditMinPeople}
                          min={2}
                          max={100}
                          step={1}
                          disabled={savingEdit}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">
                          Prévia
                        </div>
                        <div className="px-4 py-3 rounded-2xl bg-black/30 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50">
                          {(() => {
                            const iso = buildIsoFromParts(editDate, editTime);
                            const loc = editLocation.trim();
                            if (!iso || !loc)
                              return "Preencha data, horário e local";
                            const min = Math.max(
                              2,
                              Math.min(100, Number(editMinPeople) || 10),
                            );
                            return `${formatShort(iso)} · ${loc} · mínimo ${min}`;
                          })()}
                        </div>
                      </div>
                      <div className="sm:col-span-1 flex items-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEventId(null)}
                          disabled={savingEdit}
                          className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={async () => {
                            if (savingEdit) return;
                            const startsAt = buildIsoFromParts(
                              editDate,
                              editTime,
                            );
                            const loc = editLocation.trim();
                            const min = Math.max(
                              2,
                              Math.min(100, Number(editMinPeople) || 10),
                            );
                            if (!startsAt) {
                              toast.warning("Informe data e horário válidos.", {
                                title: "Campos obrigatórios",
                              });
                              return;
                            }
                            if (!loc) {
                              toast.warning("Informe o local.", {
                                title: "Campos obrigatórios",
                              });
                              return;
                            }
                            setSavingEdit(true);
                            try {
                              await agenda.updateEvent({
                                id: e.id,
                                startsAt,
                                location: loc,
                                minPeople: min,
                              });
                              setEditingEventId(null);
                              toast.success("Agendamento atualizado.", {
                                title: "Agenda",
                              });
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Não foi possível atualizar.",
                                { title: "Falha" },
                              );
                            } finally {
                              setSavingEdit(false);
                            }
                          }}
                          className="w-full py-3 rounded-2xl bg-cyan-500 text-black font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition disabled:opacity-60"
                        >
                          {savingEdit ? "Salvando..." : "Salvar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
                      Confirmados ({confirmedCount})
                    </div>
                    {confirmedCount > 8 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedConfirmedByEventId((prev) => ({
                            ...prev,
                            [e.id]: !prev[e.id],
                          }))
                        }
                        className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-cyan-300 transition"
                      >
                        {expandedConfirmedByEventId[e.id]
                          ? "Mostrar menos"
                          : "Mostrar todos"}
                      </button>
                    )}
                  </div>
                  {confirmedCount === 0 ? (
                    <div className="text-white/30 text-sm font-medium">
                      Nenhuma confirmação ainda.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {confirmedUserIds
                        .map((uid) => {
                          const p = playersByUserId.get(uid);
                          const name = agenda.userNameByUserId.get(uid);
                          const label =
                            p?.nick ||
                            p?.displayName ||
                            name ||
                            `Usuário ${uid.slice(0, 6)}`;
                          return { uid, label };
                        })
                        .sort((a, b) => a.label.localeCompare(b.label))
                        .slice(
                          0,
                          expandedConfirmedByEventId[e.id] ? confirmedCount : 8,
                        )
                        .map(({ uid, label }) => (
                          <span
                            key={uid}
                            className="px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60"
                          >
                            {label}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
