import React, { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { NumberStepper } from "@/shared/ui/NumberStepper";
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

function readPersisted(storageKey: string): PersistedMatchTimerState | null {
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

    if (enabled === null || mode === null || durationSec === null || elapsedMs === null || remainingMs === null || running === null) {
      return null;
    }

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

function buildInitialState(params: {
  defaultEnabled?: boolean;
  defaultMode?: MatchTimerMode;
  defaultDurationSec?: number;
}): PersistedMatchTimerState {
  const mode = params.defaultMode ?? "timer";
  const durationSec = clampInt(Math.floor(params.defaultDurationSec ?? 10 * 60), 0, 24 * 60 * 60);
  const remainingMs = durationSec * 1000;
  return {
    v: 1,
    enabled: Boolean(params.defaultEnabled),
    mode,
    durationSec,
    elapsedMs: 0,
    remainingMs,
    running: false,
    startedAtMs: null,
  };
}

export function MatchTimer(props: {
  storageKey: string;
  defaultEnabled?: boolean;
  defaultMode?: MatchTimerMode;
  defaultDurationSec?: number;
  className?: string;
}) {
  const { storageKey, className } = props;

  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<MatchTimerMode>("timer");
  const [durationSec, setDurationSec] = useState(10 * 60);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [remainingMs, setRemainingMs] = useState(10 * 60 * 1000);
  const [running, setRunning] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fallback = buildInitialState({
      defaultEnabled: props.defaultEnabled,
      defaultMode: props.defaultMode,
      defaultDurationSec: props.defaultDurationSec,
    });
    const persisted = readPersisted(storageKey) ?? fallback;

    const now = Date.now();
    const startedAt = persisted.running ? persisted.startedAtMs : null;
    const safeStartedAt = startedAt && startedAt > 0 && startedAt <= now + 5 * 60 * 1000 ? startedAt : null;
    let runningFinal = Boolean(persisted.running && safeStartedAt);

    let elapsedBaseMs = persisted.elapsedMs;
    let remainingBaseMs = persisted.remainingMs;
    if (runningFinal && safeStartedAt) {
      const delta = Math.max(0, now - safeStartedAt);
      if (persisted.mode === "stopwatch") {
        elapsedBaseMs = persisted.elapsedMs + delta;
      } else {
        remainingBaseMs = Math.max(0, persisted.remainingMs - delta);
      }
    }

    setEnabled(persisted.enabled);
    setMode(persisted.mode);
    setDurationSec(persisted.durationSec);
    setElapsedMs(elapsedBaseMs);
    setRemainingMs(persisted.mode === "timer" ? remainingBaseMs : persisted.durationSec * 1000);

    if (persisted.mode === "timer" && remainingBaseMs <= 0) runningFinal = false;
    setRunning(runningFinal);
    setStartedAtMs(runningFinal ? now : null);

    setHydrated(true);
  }, [props.defaultDurationSec, props.defaultEnabled, props.defaultMode, storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    const data: PersistedMatchTimerState = {
      v: 1,
      enabled,
      mode,
      durationSec,
      elapsedMs,
      remainingMs,
      running,
      startedAtMs,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch {}
  }, [durationSec, elapsedMs, enabled, hydrated, mode, remainingMs, running, startedAtMs, storageKey]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 250);
    return () => window.clearInterval(id);
  }, [running]);

  const nowMs = useMemo(() => (running ? Date.now() : 0), [running, tick]);

  const displayMs = useMemo(() => {
    if (!running || !startedAtMs) {
      return mode === "stopwatch" ? elapsedMs : remainingMs;
    }
    const delta = Math.max(0, nowMs - startedAtMs);
    if (mode === "stopwatch") return elapsedMs + delta;
    return Math.max(0, remainingMs - delta);
  }, [elapsedMs, mode, nowMs, remainingMs, running, startedAtMs]);

  useEffect(() => {
    if (mode !== "timer") return;
    if (!running || !startedAtMs) return;
    if (displayMs > 0) return;
    setRunning(false);
    setStartedAtMs(null);
    setRemainingMs(0);
  }, [displayMs, mode, running, startedAtMs]);

  const minutes = useMemo(() => Math.floor(durationSec / 60), [durationSec]);
  const seconds = useMemo(() => durationSec % 60, [durationSec]);

  const canStart = useMemo(() => {
    if (!enabled) return false;
    if (running) return false;
    if (mode === "stopwatch") return true;
    return durationSec > 0 && remainingMs > 0;
  }, [durationSec, enabled, mode, remainingMs, running]);

  const start = () => {
    if (!canStart) return;
    setRunning(true);
    setStartedAtMs(Date.now());
  };

  const pause = () => {
    if (!running || !startedAtMs) return;
    const delta = Math.max(0, Date.now() - startedAtMs);
    if (mode === "stopwatch") setElapsedMs((ms) => ms + delta);
    if (mode === "timer") setRemainingMs((ms) => Math.max(0, ms - delta));
    setRunning(false);
    setStartedAtMs(null);
  };

  const reset = () => {
    setRunning(false);
    setStartedAtMs(null);
    if (mode === "stopwatch") {
      setElapsedMs(0);
      return;
    }
    const next = durationSec * 1000;
    setRemainingMs(next);
  };

  const applyDuration = (nextDurationSec: number) => {
    const next = clampInt(Math.floor(nextDurationSec), 0, 24 * 60 * 60);
    setDurationSec(next);
    if (mode === "timer" && !running) setRemainingMs(next * 1000);
  };

  const switchMode = (nextMode: MatchTimerMode) => {
    if (nextMode === mode) return;
    setRunning(false);
    setStartedAtMs(null);
    setMode(nextMode);
    if (nextMode === "stopwatch") {
      setElapsedMs(0);
      return;
    }
    setRemainingMs(durationSec * 1000);
  };

  if (!hydrated) return null;

  if (!enabled) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-300 hover:border-cyan-500/30 transition inline-flex items-center justify-center gap-2"
        >
          <Timer className="w-4 h-4" />
          Adicionar cronômetro
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
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Cronômetro</div>
          <div className="mt-1 text-[11px] font-bold text-white/60">
            {mode === "stopwatch" ? "Modo cronômetro" : "Modo timer"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRunning(false);
            setStartedAtMs(null);
            setEnabled(false);
          }}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => switchMode("stopwatch")}
          className={[
            "py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition",
            mode === "stopwatch"
              ? "bg-cyan-500 border-cyan-400 text-black"
              : "bg-white/5 border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/30",
          ].join(" ")}
        >
          Cronômetro
        </button>
        <button
          type="button"
          onClick={() => switchMode("timer")}
          className={[
            "py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition",
            mode === "timer"
              ? "bg-cyan-500 border-cyan-400 text-black"
              : "bg-white/5 border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/30",
          ].join(" ")}
        >
          Timer
        </button>
      </div>

      <div className="mt-5 bg-black/25 border border-white/10 rounded-[24px] p-4 sm:p-5">
        <div className="text-center tabular-nums text-4xl sm:text-5xl font-black tracking-tight">
          {formatMs(displayMs)}
        </div>
        {mode === "timer" && (
          <div className="mt-2 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/30">
            {running ? "Contando..." : "Defina o tempo e inicie"}
          </div>
        )}
      </div>

      {mode === "timer" && !running && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] border border-white/10 rounded-[20px] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Min</div>
            <NumberStepper
              value={minutes}
              min={0}
              max={180}
              onChange={(m) => applyDuration(clampInt(m, 0, 180) * 60 + seconds)}
            />
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-[20px] p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2">Seg</div>
            <NumberStepper
              value={seconds}
              min={0}
              max={59}
              onChange={(s) => applyDuration(minutes * 60 + clampInt(s, 0, 59))}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {!running ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={start}
            className={[
              "py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition inline-flex items-center justify-center gap-2",
              canStart
                ? "bg-emerald-500/20 border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/30"
                : "bg-white/5 border-white/10 text-white/30 cursor-not-allowed",
            ].join(" ")}
          >
            <Play className="w-4 h-4" />
            Iniciar
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="py-3 rounded-2xl border bg-yellow-500/15 border-yellow-500/25 text-[10px] font-black uppercase tracking-widest text-yellow-200 hover:bg-yellow-500/25 transition inline-flex items-center justify-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
        )}

        <button
          type="button"
          onClick={reset}
          className="py-3 rounded-2xl border bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-cyan-300 hover:border-cyan-500/30 transition inline-flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Resetar
        </button>
      </div>
    </div>
  );
}

