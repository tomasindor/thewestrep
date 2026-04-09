"use client";

import { useEffect, useId, useState } from "react";

import type { ProductSizeGuide } from "@/lib/catalog/types";

interface ProductSizeGuideModalProps {
  sizeGuide: ProductSizeGuide;
}

export function ProductSizeGuideModal({ sizeGuide }: ProductSizeGuideModalProps) {
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-[rgba(210,138,163,0.26)] bg-[rgba(210,138,163,0.1)] px-3.5 py-2 text-[11px] font-medium tracking-[0.22em] text-[#f6dbe4] uppercase transition hover:border-[rgba(210,138,163,0.56)] hover:bg-[rgba(210,138,163,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
      >
        Ver guía de talles
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setIsOpen(false)}
        >
          <div className="absolute inset-0 bg-[rgba(4,6,10,0.82)] backdrop-blur-md" />

          <div
            className="relative z-10 flex w-full max-w-4xl flex-col gap-5 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.98),rgba(7,9,14,0.99))] p-5 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/8 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[11px] font-medium tracking-[0.26em] text-[#f1d2dc]/68 uppercase">Guía de talles</p>
                <h2 id={titleId} className="font-display text-3xl leading-none text-white sm:text-[2.6rem]">
                  {sizeGuide.title?.trim() || "Tabla de medidas"}
                </h2>
                {sizeGuide.unitLabel ? (
                  <p className="text-sm text-slate-300">Medidas expresadas en {sizeGuide.unitLabel}.</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-xl text-white transition hover:border-white/24 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                aria-label="Cerrar guía de talles"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black/20">
              <div className="max-h-[65vh] overflow-auto">
                <table className="min-w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-[rgba(10,12,18,0.98)] backdrop-blur">
                    <tr>
                      <th className="border-b border-white/10 px-4 py-3 text-[11px] font-medium tracking-[0.22em] text-white/58 uppercase">
                        Talle
                      </th>
                      {sizeGuide.columns.map((column) => (
                        <th
                          key={column}
                          className="border-b border-white/10 px-4 py-3 text-[11px] font-medium tracking-[0.22em] text-white/58 uppercase"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuide.rows.map((row, index) => (
                      <tr key={`${row.label}-${index}`} className="border-b border-white/6 last:border-b-0 odd:bg-white/[0.015]">
                        <th className="px-4 py-3 text-sm font-semibold tracking-[0.16em] text-[#f6dbe4] uppercase">{row.label}</th>
                        {sizeGuide.columns.map((column, valueIndex) => (
                          <td key={`${row.label}-${column}`} className="px-4 py-3 text-sm text-slate-200">
                            {row.values[valueIndex] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-400">Las medidas pueden variar de 1 a 3 cm.</p>

            {sizeGuide.notes ? <p className="text-sm leading-6 text-slate-300">{sizeGuide.notes}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
