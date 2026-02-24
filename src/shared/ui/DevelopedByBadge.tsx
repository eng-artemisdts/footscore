import React from "react";

const ARTEMIS_URL = "https://www.artemisdigital.tech/";

export function DevelopedByBadge() {
  const logoSrc = `${import.meta.env.BASE_URL}credits/artemis.png`;

  return (
    <a
      href={ARTEMIS_URL}
      target="_blank"
      rel="noreferrer"
      className={[
        "group print:hidden fixed z-[90] select-none",
        "rounded-full border border-white/10 bg-black/0 hover:bg-black/45 backdrop-blur-2xl shadow-lg shadow-black/30",
        "px-2.5 py-1.5 sm:px-3 sm:py-2",
        "text-[10px] sm:text-xs font-extrabold tracking-wide text-white/55",
        "opacity-30 hover:opacity-100 focus:opacity-100",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/80",
        "transition",
      ].join(" ")}
      style={{
        right: "1rem",
        bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Desenvolvido por Artemis Digital Solutions"
      title="Desenvolvido por Artemis Digital Solutions"
    >
      <span className="flex items-center gap-2">
        <span className="uppercase">Desenvolvido por</span>
        <img
          src={logoSrc}
          alt="Artemis Digital Solutions"
          className="h-3.5 sm:h-4 w-auto transition"
          loading="lazy"
          decoding="async"
        />
      </span>
    </a>
  );
}
