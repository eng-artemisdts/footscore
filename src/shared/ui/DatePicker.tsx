import React, { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

function parseYmdLocal(value: string): Date | null {
  const raw = (value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}

function toYmdLocal(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function DatePicker(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
}) {
  const { value, onChange, disabled, placeholder, min } = props;
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => parseYmdLocal(value), [value]);
  const minDate = useMemo(() => (min ? parseYmdLocal(min) : null), [min]);
  const effectiveSelected =
    selected && minDate && selected.getTime() < minDate.getTime()
      ? null
      : selected;
  const label = effectiveSelected
    ? format(effectiveSelected, "PPP", { locale: ptBR })
    : (placeholder ?? "Selecionar data");

  const setValueFromDate = (dt: Date) => {
    onChange(toYmdLocal(dt));
  };

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
          aria-label="Selecionar data"
        >
          <span
            className={[
              "min-w-0 truncate",
              effectiveSelected ? "text-white/80" : "text-white/35",
            ].join(" ")}
          >
            {label}
          </span>
          <Calendar className="w-4 h-4 text-white/30 shrink-0" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          style={{ zIndex: 105 }}
          className="relative z-[105] w-[min(360px,calc(100vw-32px))] rounded-[28px] bg-[#0c1220] border border-white/10 shadow-2xl p-4 outline-none"
        >
          <DayPicker
            mode="single"
            selected={effectiveSelected ?? undefined}
            defaultMonth={(effectiveSelected ?? minDate ?? new Date()) as Date}
            fromDate={minDate ?? undefined}
            disabled={minDate ? { before: minDate } : undefined}
            onSelect={(dt) => {
              if (!dt) return;
              setOpen(false);
              setValueFromDate(dt);
            }}
            locale={ptBR}
            weekStartsOn={1}
            showOutsideDays
            components={{
              Chevron: (p) =>
                p.orientation === "left" ? (
                  <ChevronLeft className={p.className} aria-hidden="true" />
                ) : (
                  <ChevronRight className={p.className} aria-hidden="true" />
                ),
            }}
            classNames={{
              root: "p-0",
              months: "flex flex-col",
              month: "space-y-3",
              month_caption: "flex items-center justify-between gap-2",
              caption_label:
                "text-[10px] font-black uppercase tracking-[0.2em] text-white/70",
              nav: "flex items-center gap-1",
              button_previous:
                "h-8 w-8 inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-40",
              button_next:
                "h-8 w-8 inline-flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-cyan-400 hover:border-cyan-500/30 transition disabled:opacity-40",
              chevron: "h-4 w-4",
              month_grid: "w-full border-collapse",
              weekdays: "flex",
              weekday:
                "w-10 text-center text-[9px] font-black uppercase tracking-[0.2em] text-white/30",
              weeks: "flex flex-col gap-1",
              week: "flex",
              day: "w-10 h-10 p-0",
              day_button: [
                "w-10 h-10 rounded-xl text-[10px] font-black transition",
                "text-white/70 hover:bg-white/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30",
                "aria-selected:bg-cyan-500 aria-selected:text-black aria-selected:shadow-lg aria-selected:shadow-cyan-500/20",
              ].join(" "),
              outside: "opacity-30",
              disabled: "opacity-20",
              today: "text-cyan-300",
              selected: "",
            }}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onChange("");
              }}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white hover:border-white/20 transition"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setValueFromDate(new Date());
              }}
              className="px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-[10px] font-black uppercase tracking-widest text-cyan-200 hover:bg-cyan-500/25 transition"
            >
              Hoje
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

