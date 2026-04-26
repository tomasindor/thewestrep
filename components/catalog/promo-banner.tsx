"use client";

import { useState } from "react";

interface PromoBannerProps {
  title?: string;
  rules?: string;
  disclosure?: string;
  className?: string;
  onDismiss?: () => void;
}

export function PromoBanner({
  title = "30% OFF en la segunda unidad",
  rules = "Combiná 1 pantalón + 1 buzo/campera",
  disclosure = "Descuento sobre la prenda más barata",
  className,
  onDismiss,
}: PromoBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  return (
    <section
      aria-label="Información de promoción"
      className={`rounded-[1.3rem] border border-[rgba(210,138,163,0.42)] bg-[rgba(210,138,163,0.12)] p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="text-sm font-medium text-slate-100">{rules}</p>
          <p className="text-sm text-slate-300">{disclosure}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="inline-flex min-h-10 items-center rounded-full border border-white/16 px-4 text-xs tracking-[0.22em] text-white/85 uppercase transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.68)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Ocultar aviso"
        >
          Ocultar aviso
        </button>
      </div>
    </section>
  );
}
