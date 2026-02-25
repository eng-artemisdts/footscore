import React, { useEffect, useMemo, useState } from "react";
import { Clock, Minus, Plus, RotateCcw, X } from "lucide-react";
import { clampInt } from "@/shared/number";

type MatchTimerMode = "stopwatch" | "timer";

type PersistedMatchTimerState = {
  v: 1;
  enabled: boolean;
  mode: MatchTimerMode;
  durationSec: number;
  elapsedMs: number;
  remainingMs: number;
  running: boolean;
  startedAtMs: number | null;
};

type GoalEvent = {
  id: string;
  teamId: string;
  matchTimeMs: number | null;
  createdAtIso: string;
};

type PersistedGoalsStateV1 = {
  v: 1;
  events: GoalEvent[];
  logOpen: boolean;
};

type PersistedGoalsStateV2 = {
  v: 2;
  enabled: boolean;
  events: GoalEvent[];
  logOpen: boolean;
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function safeMode(value: unknown): MatchTimerMode | null {
  return value === "stopwatch" || value === "timer" ? value : null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

function readTimer(storageKey: string): PersistedMatchTimerState | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedMatchTimerState>;
    if (!parsed || parsed.v !== 1) return null;
    const enabled = safeBoolean(parsed.enabled);
    const mode = safeMode(parsed.mode);
    const durationSec = safeNumber(parsed.durationSec);
    const elapsedMs = safeNumber(parsed.elapsedMs);
    const remainingMs = safeNumber(parsed.remainingMs);
    const running = safeBoolean(parsed.running);
    const startedAtMs = parsed.startedAtMs === null ? null : safeNumber(parsed.startedAtMs);
    if (enabled === null || mode === null || durationSec === null || elapsedMs === null || remainingMs === null || running === null) return null;
    return {
      v: 1,
      enabled,
      mode,
      durationSec: clampInt(Math.floor(durationSec), 0, 24 * 60 * 60),
      elapsedMs: clampInt(Math.floor(elapsedMs), 0, 365 * 24 * 60 * 60 * 1000),
      remainingMs: clampInt(Math.floor(remainingMs), 0, 24 * 60 * 60 * 1000),
      running,
      startedAtMs: startedAtMs === null ? null : clampInt(Math.floor(startedAtMs), 0, Number.MAX_SAFE_INTEGER),
    };
  } catch {
    return null;
  }
}

function readGoals(storageKey: string): PersistedGoalsStateV2 | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedGoalsStateV1> | Partial<PersistedGoalsStateV2>;
    if (!parsed || !Array.isArray(parsed.events)) return null;
    const logOpen = typeof parsed.logOpen === "boolean" ? parsed.logOpen : false;
    const events = parsed.events
      .filter((e): e is GoalEvent => Boolean(e && typeof e.id === "string" && typeof e.teamId === "string" && typeof e.createdAtIso === "string"))
      .map((e) => ({
        id: e.id,
        teamId: e.teamId,
        matchTimeMs: typeof e.matchTimeMs === "number" && Number.isFinite(e.matchTimeMs) ? clampInt(Math.floor(e.matchTimeMs), 0, 365 * 24 * 60 * 60 * 1000) : null,
        createdAtIso: e.createdAtIso,
      }));
    const enabledFromV2 = typeof (parsed as Partial<PersistedGoalsStateV2>).enabled === "boolean" ? (parsed as Partial<PersistedGoalsStateV2>).enabled as boolean : null;
    const enabled = enabledFromV2 ?? events.length > 0;
    return { v: 2, enabled, events, logOpen };
  } catch {
    return null;
  }
}

function elapsedFromTimer(timer: PersistedMatchTimerState, nowMs: number) {
  if (!timer.enabled) return null;
  const running = Boolean(timer.running && timer.startedAtMs);
  const delta = running && timer.startedAtMs ? Math.max(0, nowMs - timer.startedAtMs) : 0;
  if (timer.mode === "stopwatch") return timer.elapsedMs + delta;
  const remaining = Math.max(0, timer.remainingMs - delta);
  const durationMs = timer.durationSec * 1000;
  return clampInt(durationMs - remaining, 0, durationMs);
}

export function MatchGoals(props: {
  storageKey: string;
  timerStorageKey?: string;
  homeTeam: { id: string; name: string; colorHex: string };
  awayTeam: { id: string; name: string; colorHex: string };
  className?: string;
}) {
  const { storageKey, timerStorageKey, homeTeam, awayTeam, className } = props;

  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [events, setEvents] = useState<GoalEvent[]>([]);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const persisted = readGoals(storageKey);
    setEnabled(Boolean(persisted?.enabled));
    setEvents(persisted?.events ?? []);
    setLogOpen(Boolean(persisted?.logOpen));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const data: PersistedGoalsStateV2 = { v: 2, enabled, events, logOpen };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [enabled, events, hydrated, logOpen, storageKey]);

  const goalsByTeamId = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.teamId, (map.get(e.teamId) ?? 0) + 1);
    return map;
  }, [events]);

  const homeGoals = goalsByTeamId.get(homeTeam.id) ?? 0;
  const awayGoals = goalsByTeamId.get(awayTeam.id) ?? 0;

  const addGoal = (teamId: string) => {
    const now = Date.now();
    const timer = timerStorageKey ? readTimer(timerStorageKey) : null;
    const matchTimeMs = timer ? elapsedFromTimer(timer, now) : null;
    const createdAtIso = new Date(now).toISOString();
    setEvents((prev) => [...prev, { id: generateId(), teamId, matchTimeMs, createdAtIso }]);
    setLogOpen(true);
  };

  const removeLastGoal = (teamId: string) => {
    setEvents((prev) => {
      const idx = [...prev].reverse().findIndex((e) => e.teamId === teamId);
      if (idx === -1) return prev;
      const removeAt = prev.length - 1 - idx;
      return prev.filter((_, i) => i !== removeAt);
    });
  };

  const reset = () => {
    setEvents([]);
    setLogOpen(false);
  };

  const lastGoals = useMemo(() => events.slice(-8).reverse(), [events]);

  if (!hydrated) return null;

  if (!enabled) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-300 hover:border-cyan-500/30 transition inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Exibir placar
        </button>
      </div>
    );
  }

  return (
    <div
      className={[
        "bg-white/[0.03] border border-white/10 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 shadow-xl",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Placar</div>
          <div className="mt-1 text-[11px] font-bold text-white/60">
            {homeTeam.name} × {awayTeam.name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
            aria-label="Zerar placar"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setLogOpen(false);
              setEnabled(false);
            }}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-black/25 border border-white/10 rounded-[24px] overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: homeTeam.colorHex }} />
          <div className="p-3 sm:p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 truncate">
              {homeTeam.name}
            </div>
            <div className="mt-1 tabular-nums text-4xl sm:text-5xl font-black text-white">
              {homeGoals}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addGoal(homeTeam.id)}
                className="h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/25 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/30 transition inline-flex items-center justify-center gap-2"
                aria-label={`Adicionar gol para ${homeTeam.name}`}
              >
                <Plus className="w-4 h-4" />
                Gol
              </button>
              <button
                type="button"
                disabled={homeGoals <= 0}
                onClick={() => removeLastGoal(homeTeam.id)}
                className={[
                  "h-11 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition inline-flex items-center justify-center gap-2",
                  homeGoals > 0
                    ? "bg-white/5 border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/30"
                    : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-70",
                ].join(" ")}
                aria-label={`Remover último gol de ${homeTeam.name}`}
              >
                <Minus className="w-4 h-4" />
                Undo
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/25 border border-white/10 rounded-[24px] overflow-hidden">
          <div className="h-1.5" style={{ backgroundColor: awayTeam.colorHex }} />
          <div className="p-3 sm:p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 truncate">
              {awayTeam.name}
            </div>
            <div className="mt-1 tabular-nums text-4xl sm:text-5xl font-black text-white">
              {awayGoals}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addGoal(awayTeam.id)}
                className="h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/25 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/30 transition inline-flex items-center justify-center gap-2"
                aria-label={`Adicionar gol para ${awayTeam.name}`}
              >
                <Plus className="w-4 h-4" />
                Gol
              </button>
              <button
                type="button"
                disabled={awayGoals <= 0}
                onClick={() => removeLastGoal(awayTeam.id)}
                className={[
                  "h-11 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition inline-flex items-center justify-center gap-2",
                  awayGoals > 0
                    ? "bg-white/5 border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/30"
                    : "bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-70",
                ].join(" ")}
                aria-label={`Remover último gol de ${awayTeam.name}`}
              >
                <Minus className="w-4 h-4" />
                Undo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-300 hover:border-cyan-500/30 transition inline-flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          {logOpen ? "Ocultar gols" : "Ver gols"}
        </button>
      </div>

      {logOpen && (
        <div className="mt-3 bg-white/[0.02] border border-white/10 rounded-[24px] p-3 sm:p-4">
          {lastGoals.length === 0 ? (
            <div className="text-center text-[10px] font-bold text-white/35 py-6">Nenhum gol ainda</div>
          ) : (
            <div className="space-y-2">
              {lastGoals.map((g) => {
                const isHome = g.teamId === homeTeam.id;
                const team = isHome ? homeTeam : awayTeam;
                const time = typeof g.matchTimeMs === "number" ? formatMs(g.matchTimeMs) : null;
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-3 bg-black/25 border border-white/10 rounded-2xl px-3 py-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: team.colorHex }} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70 truncate">
                        {team.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-white/35 tabular-nums">
                      {time ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

