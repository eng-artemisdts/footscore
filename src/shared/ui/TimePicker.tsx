import React, { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Clock } from "lucide-react";
import { clampInt } from "@/shared/number";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseHm(value: string): { h: number; m: number } | null {
  const raw = (value || "").trim();
  const match = /^(\d{2}):(\d{2})$/.exec(raw);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23) return null;
  if (m < 0 || m > 59) return null;
  return { h, m };
}

function toHm(h: number, m: number) {
  return `${pad2(h)}:${pad2(m)}`;
}

function nowHmRounded(stepMinutes: number) {
  const step = clampInt(stepMinutes, 1, 60);
  const d = new Date();
  const total = d.getHours() * 60 + d.getMinutes();
  const rounded = Math.round(total / step) * step;
  const h = Math.floor(rounded / 60) % 24;
  const m = rounded % 60;
  return toHm(h, m);
}

function buildOptions(params: {
  startHour: number;
  endHour: number;
  stepMinutes: number;
}) {
  const startHour = clampInt(params.startHour, 0, 23);
  const endHour = clampInt(params.endHour, 0, 23);
  const stepMinutes = clampInt(params.stepMinutes, 1, 60);

  const start = Math.min(startHour, endHour) * 60;
  const end = Math.max(startHour, endHour) * 60 + 59;

  const out: string[] = [];
  for (let t = start; t <= end; t += stepMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(toHm(h, m));
  }
  return out;
}

export function TimePicker(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  stepMinutes?: number;
  startHour?: number;
  endHour?: number;
}) {
  const {
    value,
    onChange,
    disabled,
    placeholder,
    stepMinutes = 10,
    startHour = 6,
    endHour = 23,
  } = props;

  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseHm(value), [value]);
  const label = selected ? value : (placeholder ?? "Selecionar horário");

  const options = useMemo(
    () => buildOptions({ startHour, endHour, stepMinutes }),
    [endHour, startHour, stepMinutes],
  );

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={[
            "w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold transition flex items-center justify-between gap-3",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/50",
            disabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/20",
          ].join(" ")}
          aria-label="Selecionar horário"
        >
          <span
            className={[
              "min-w-0 truncate tabular-nums",
              selected ? "text-white/80" : "text-white/35",
            ].join(" ")}
          >
            {label}
          </span>
          <Clock className="w-4 h-4 text-white/30 shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          style={{ zIndex: 105 }}
          className="relative z-[105] w-[min(360px,calc(100vw-32px))] rounded-[28px] bg-[#0c1220] border border-white/10 shadow-2xl p-4 outline-none"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Horário
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = nowHmRounded(stepMinutes);
                  onChange(next);
                  setOpen(false);
                }}
                className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/25 transition"
              >
                Agora
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-white/20 transition"
              >
                Limpar
              </button>
            </div>
          </div>

          <input
            type="time"
            value={value}
            step={stepMinutes * 60}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-cyan-500/50 text-white/80 tabular-nums"
          />

          <div className="mt-3 max-h-56 overflow-auto pr-1">
            <div className="grid grid-cols-4 gap-2">
              {options.map((hm) => {
                const active = hm === value;
                return (
                  <button
                    key={hm}
                    type="button"
                    onClick={() => {
                      onChange(hm);
                      setOpen(false);
                    }}
                    className={[
                      "py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition tabular-nums",
                      active
                        ? "bg-cyan-500 border-cyan-400 text-black"
                        : "bg-white/5 border-white/10 text-white/60 hover:text-cyan-300 hover:border-cyan-500/30",
                    ].join(" ")}
                  >
                    {hm}
                  </button>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

