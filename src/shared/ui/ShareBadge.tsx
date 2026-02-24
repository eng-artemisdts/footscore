import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import * as Popover from "@radix-ui/react-popover";
import { Share2, Copy, Check, MessageCircle, X } from "lucide-react";

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "-9999px";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

type ShareBadgeProps = {
  title?: string;
};

export function ShareBadge({ title }: ShareBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const location = useLocation();
  const currentTitle = (title ?? document.title).trim() || "FutScore — Manager";

  const url = useMemo(() => {
    const base = window.location.origin;
    return `${base}${location.pathname}${location.search}${location.hash}`;
  }, [location.pathname, location.search, location.hash]);
  const shareText = useMemo(() => `${currentTitle} ${url}`.trim(), [currentTitle, url]);

  const whatsappUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );
  const xUrl = useMemo(
    () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );

  async function handleShare() {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };

    if (nav.share) {
      await nav.share({ title: currentTitle, text: currentTitle, url });
      setOpen(false);
      return;
    }
    openInNewTab(whatsappUrl);
    setOpen(false);
  }

  async function handleCopy() {
    await copyToClipboard(url);
    setCopied(true);
    setOpen(false);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={[
            "group print:hidden fixed z-[90] select-none",
            "rounded-full border border-white/10 bg-black/0 hover:bg-black/45 backdrop-blur-2xl shadow-lg shadow-black/30",
            "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center",
            "text-white/60 hover:text-white",
            "opacity-25 hover:opacity-100 focus:opacity-100",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80",
            "transition",
          ].join(" ")}
          style={{
            right: "1rem",
            bottom: "calc(1rem + env(safe-area-inset-bottom, 0px) + 3.5rem)",
          }}
          aria-label="Compartilhar"
          title="Compartilhar"
        >
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          side="top"
          sideOffset={10}
          className={[
            "z-[95] w-[260px] rounded-2xl border border-white/10 bg-black/70 backdrop-blur-3xl shadow-2xl shadow-black/40 overflow-hidden",
            "p-2",
          ].join(" ")}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
            onClick={() => void handleShare()}
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
            onClick={() => void handleCopy()}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link copiado" : "Copiar link"}
          </button>

          <div className="my-2 h-px bg-white/10" />

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
            onClick={() => {
              openInNewTab(whatsappUrl);
              setOpen(false);
            }}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 transition"
            onClick={() => {
              openInNewTab(xUrl);
              setOpen(false);
            }}
          >
            <X className="w-4 h-4" />
            X
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

