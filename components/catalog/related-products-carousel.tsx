"use client";

import { useKeenSlider } from "keen-slider/react";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import type { CatalogProduct } from "@/lib/catalog/models";

import styles from "./related-products-carousel.module.css";

interface RelatedProductsCarouselProps {
  products: CatalogProduct[];
}

export function RelatedProductsCarousel({ products }: RelatedProductsCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const canSlide = products.length > 1;
  const desktopPerView = useMemo(() => Math.min(products.length, 3.2), [products.length]);
  const tabletPerView = useMemo(() => Math.min(products.length, 2.2), [products.length]);

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: canSlide,
    drag: canSlide,
    rubberband: false,
    renderMode: "performance",
    created() {
      setLoaded(true);
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel);
    },
    slides: {
      origin: "auto",
      perView: 1.08,
      spacing: 18,
    },
    breakpoints: {
      "(min-width: 640px)": {
        slides: {
          origin: "auto",
          perView: tabletPerView,
          spacing: 22,
        },
      },
      "(min-width: 1024px)": {
        slides: {
          origin: "auto",
          perView: desktopPerView,
          spacing: 24,
        },
      },
    },
  });

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-[0.24em] text-white/42 uppercase">
          {products.length} {products.length === 1 ? "producto sugerido" : "productos sugeridos"}
        </p>

        {canSlide ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => instanceRef.current?.prev()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Ver productos relacionados anteriores"
              disabled={!loaded}
            >
              <span aria-hidden="true" className="text-lg">
                ←
              </span>
            </button>
            <button
              type="button"
              onClick={() => instanceRef.current?.next()}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Ver más productos relacionados"
              disabled={!loaded}
            >
              <span aria-hidden="true" className="text-lg">
                →
              </span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden">
        <div ref={sliderRef} className={`keen-slider ${styles.slider}`}>
          {products.map((relatedProduct) => (
            <div key={relatedProduct.id} className={`keen-slider__slide ${styles.slide}`}>
              <ProductCard product={relatedProduct} variant="related" contextAvailability={relatedProduct.availability} />
            </div>
          ))}
        </div>
      </div>

      {canSlide ? (
        <div className="flex items-center gap-2">
          {products.map((relatedProduct, index) => {
            const isActive = currentSlide === index;

            return (
              <button
                key={relatedProduct.id}
                type="button"
                onClick={() => instanceRef.current?.moveToIdx(index)}
                className={`h-1.5 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.75)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  isActive ? "w-9 bg-[rgba(236,203,214,0.92)]" : "w-5 bg-white/14 hover:bg-white/28"
                }`}
                aria-label={`Ir al producto relacionado ${index + 1}`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
