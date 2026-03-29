'use client'

import { Children, type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

type CarouselVisibleItems = {
  base: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
};

type CarouselProps = {
  children: ReactNode;
  ariaLabel: string;
  visibleItems: CarouselVisibleItems;
  itemLabel?: string;
  className?: string;
  viewportClassName?: string;
  pageClassName?: string;
  showViewCounter?: boolean;
};

const breakpointMinWidth = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

const carouselGap = 16;

function resolveVisibleItems(width: number, visibleItems: CarouselVisibleItems) {
  let current = visibleItems.base;

  for (const [breakpoint, minWidth] of Object.entries(breakpointMinWidth) as Array<
    [keyof typeof breakpointMinWidth, number]
  >) {
    if (width >= minWidth && visibleItems[breakpoint]) {
      current = visibleItems[breakpoint] ?? current;
    }
  }

  return Math.max(1, Math.floor(current));
}

export function Carousel({
  children,
  ariaLabel,
  visibleItems,
  itemLabel = "items",
  className = "",
  viewportClassName = "",
  pageClassName = "",
  showViewCounter = true,
}: CarouselProps) {
  const items = useMemo(() => Children.toArray(children), [children]);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(() => resolveVisibleItems(0, visibleItems));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(resolveVisibleItems(window.innerWidth, visibleItems));
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);

    return () => {
      window.removeEventListener("resize", updateItemsPerPage);
    };
  }, [visibleItems]);

  useEffect(() => {
    if (!viewportRef.current) {
      return;
    }

    const updateViewportWidth = () => {
      setViewportWidth(viewportRef.current?.getBoundingClientRect().width ?? 0);
    };

    updateViewportWidth();

    const resizeObserver = new ResizeObserver(updateViewportWidth);
    resizeObserver.observe(viewportRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const totalPositions = Math.max(items.length - itemsPerPage + 1, 1);
  const isSinglePage = totalPositions <= 1;
  const safeCurrentIndex = Math.min(currentIndex, Math.max(totalPositions - 1, 0));
  const startItem = items.length === 0 ? 0 : safeCurrentIndex + 1;
  const endItem = items.length === 0 ? 0 : Math.min(safeCurrentIndex + itemsPerPage, items.length);
  const positionLabel = `${String(Math.min(safeCurrentIndex + 1, Math.max(totalPositions, 1))).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
  const itemWidth = viewportWidth > 0
    ? Math.max((viewportWidth - carouselGap * Math.max(itemsPerPage - 1, 0)) / itemsPerPage, 0)
    : 0;

  const trackStyle: CSSProperties = {
    display: "grid",
    gridAutoFlow: "column",
    columnGap: `${carouselGap}px`,
    gridAutoColumns: itemWidth > 0
      ? `${itemWidth}px`
      : `calc((100% - ${carouselGap * Math.max(itemsPerPage - 1, 0)}px) / ${itemsPerPage})`,
    transform: `translate3d(-${safeCurrentIndex * (itemWidth + carouselGap)}px, 0, 0)`,
  };

  return (
    <div className={`space-y-5 ${className}`.trim()}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-[0.24em] text-orange-100/70 uppercase">
            {startItem}-{endItem} de {items.length} {itemLabel}
          </p>
          <div className="flex items-center gap-2" aria-hidden="true">
            {Array.from({ length: totalPositions }).map((_, index) => (
              <span
                key={`carousel-dot-${index}`}
                className={
                  index === safeCurrentIndex
                    ? "h-1.5 w-6 rounded-full bg-orange-200/90"
                    : "h-1.5 w-1.5 rounded-full bg-white/20"
                }
              />
            ))}
          </div>
        </div>

        {showViewCounter ? (
          <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs tracking-[0.18em] text-slate-300 uppercase sm:self-auto">
            <span className="text-orange-100/85">{positionLabel}</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span>
              {items.length} {itemLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          aria-label={`Ir al elemento anterior de ${ariaLabel}`}
          onClick={() => setCurrentIndex((previousIndex) => Math.max(previousIndex - 1, 0))}
          disabled={safeCurrentIndex === 0 || isSinglePage}
          className="absolute top-1/2 left-1 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xl leading-none text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur transition duration-200 hover:border-orange-300/25 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-25 sm:left-2"
        >
          ←
        </button>

        <button
          type="button"
          aria-label={`Ir al elemento siguiente de ${ariaLabel}`}
          onClick={() => setCurrentIndex((previousIndex) => Math.min(previousIndex + 1, Math.max(totalPositions - 1, 0)))}
          disabled={safeCurrentIndex >= totalPositions - 1 || isSinglePage}
          className="absolute top-1/2 right-1 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-xl leading-none text-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.24)] backdrop-blur transition duration-200 hover:border-orange-300/25 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-25 sm:right-2"
        >
          →
        </button>

        <div ref={viewportRef} className={`overflow-hidden px-12 sm:px-14 ${viewportClassName}`.trim()}>
          <div
            aria-label={ariaLabel}
            className={`transition duration-500 ease-out will-change-transform ${pageClassName}`.trim()}
            style={trackStyle}
          >
            {items.map((item, itemIndex) => (
              <div
                key={`carousel-item-${itemIndex}`}
                aria-hidden={itemIndex < safeCurrentIndex || itemIndex >= safeCurrentIndex + itemsPerPage}
                className="h-full"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
