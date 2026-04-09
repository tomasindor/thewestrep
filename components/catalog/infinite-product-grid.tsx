"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { ProductGrid } from "@/components/catalog/product-grid";
import type { CatalogProduct } from "@/lib/catalog/models";

const INITIAL_BATCH_SIZE = 10;
const NEXT_BATCH_SIZE = 5;

interface InfiniteProductGridProps {
  products: CatalogProduct[];
  contextAvailability?: CatalogProduct["availability"];
}

function LoadingCards() {
  return (
    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-hidden="true">
      {Array.from({ length: NEXT_BATCH_SIZE }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.03]"
        >
          <div className="aspect-[4/5] animate-pulse bg-white/6" />
          <div className="space-y-4 p-5 sm:p-6">
            <div className="h-5 w-24 animate-pulse rounded-full bg-white/6" />
            <div className="space-y-2">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-white/8" />
              <div className="h-5 w-1/2 animate-pulse rounded-full bg-white/6" />
              <div className="h-4 w-full animate-pulse rounded-full bg-white/6" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/6" />
            </div>
            <div className="h-8 w-24 animate-pulse rounded-full bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InfiniteProductGrid({ products, contextAvailability }: InfiniteProductGridProps) {
  const initialVisibleCount = Math.min(products.length, INITIAL_BATCH_SIZE);
  const [loadedCount, setLoadedCount] = useState(initialVisibleCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
  const inViewRef = useRef(false);
  const loadedCountRef = useRef(initialVisibleCount);
  const productsLengthRef = useRef(products.length);
  const isLoadingMoreRef = useRef(false);
  const visibleCount = Math.min(products.length, Math.max(loadedCount, Math.min(products.length, INITIAL_BATCH_SIZE)));
  const hasMoreProducts = visibleCount < products.length;

  useEffect(() => {
    loadedCountRef.current = loadedCount;
    productsLengthRef.current = products.length;
    isLoadingMoreRef.current = isLoadingMore;
  }, [isLoadingMore, loadedCount, products.length]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const scheduleNextBatch = () => {
    if (isLoadingMoreRef.current || !inViewRef.current || loadedCountRef.current >= productsLengthRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    loadingTimeoutRef.current = window.setTimeout(() => {
      setLoadedCount((currentCount) => {
        const nextCount = Math.min(currentCount + NEXT_BATCH_SIZE, productsLengthRef.current);

        loadedCountRef.current = nextCount;
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
        loadingTimeoutRef.current = null;

        if (inViewRef.current && nextCount < productsLengthRef.current) {
          window.setTimeout(scheduleNextBatch, 0);
        }

        return nextCount;
      });
    }, 140);
  };

  const { ref } = useInView({
    rootMargin: "240px 0px 320px 0px",
    threshold: 0,
    onChange(nextInView) {
      inViewRef.current = nextInView;

      if (nextInView) {
        scheduleNextBatch();
      }
    },
  });

  const visibleProducts = products.slice(0, visibleCount);

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="sr-only">
        {hasMoreProducts
          ? `${visibleCount} de ${products.length} productos visibles.`
          : `Se muestran los ${products.length} productos disponibles.`}
      </div>

      <ProductGrid products={visibleProducts} contextAvailability={contextAvailability} />

      {hasMoreProducts ? (
        <div className="space-y-4 pt-2">
          <div
            ref={ref}
            className="flex min-h-12 items-center justify-center rounded-full border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-center text-sm text-slate-300"
          >
            {isLoadingMore
              ? `Cargando más productos (${visibleCount} de ${products.length})...`
              : `Mostrando ${visibleCount} de ${products.length}. Bajá un poco más y cargamos la próxima fila.`}
          </div>

          {isLoadingMore ? <LoadingCards /> : null}
        </div>
      ) : null}
    </div>
  );
}
