import React, { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeParseInt(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

export function NumberStepper(props: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const { value, onChange, disabled } = props;

  const min = useMemo(() => (Number.isFinite(props.min) ? (props.min as number) : 0), [props.min]);
  const max = useMemo(
    () => (Number.isFinite(props.max) ? (props.max as number) : 999999),
    [props.max],
  );
  const step = useMemo(
    () => (Number.isFinite(props.step) && (props.step as number) > 0 ? (props.step as number) : 1),
    [props.step],
  );

  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const lastPropValueRef = useRef<number>(value);

  useEffect(() => {
    const changed = lastPropValueRef.current !== value;
    lastPropValueRef.current = value;
    if (!editing && changed) setDraft(String(value));
  }, [editing, value]);

  const commit = (raw: string) => {
    const parsed = safeParseInt(raw);
    const next = clampInt(parsed ?? value, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const bump = (delta: number) => {
    const next = clampInt(value + delta, min, max);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const decDisabled = disabled || value <= min;
  const incDisabled = disabled || value >= max;

  return (
    <div className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex items-stretch">
      <button
        type="button"
        disabled={decDisabled}
        onClick={() => bump(-step)}
        className={[
          "w-12 h-full shrink-0 inline-flex items-center justify-center transition border-r border-white/10",
          "text-white/60 hover:text-cyan-300 hover:bg-white/5",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30",
        ].join(" ")}
        aria-label="Diminuir"
      >
        <Minus className="w-4 h-4" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onFocus={() => setEditing(true)}
        onBlur={() => {
          setEditing(false);
          commit(draft);
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          const parsed = safeParseInt(next);
          if (parsed === null) return;
          onChange(clampInt(parsed, min, max));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(step);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-step);
            return;
          }
          if (e.key === "Enter") {
            e.currentTarget.blur();
            return;
          }
          if (e.key === "Escape") {
            setDraft(String(value));
            e.currentTarget.blur();
          }
        }}
        className={[
          "flex-1 h-full min-w-0 bg-transparent text-center tabular-nums py-3",
          "text-xs font-bold text-white/80",
          "outline-none",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ].join(" ")}
        aria-label="Valor"
      />

      <button
        type="button"
        disabled={incDisabled}
        onClick={() => bump(step)}
        className={[
          "w-12 h-full shrink-0 inline-flex items-center justify-center transition border-l border-white/10",
          "text-white/60 hover:text-cyan-300 hover:bg-white/5",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30",
        ].join(" ")}
        aria-label="Aumentar"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

