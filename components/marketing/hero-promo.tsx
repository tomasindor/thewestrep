"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeenSlider } from "keen-slider/react";
import Link from "next/link";

import { HeroPromoShaderBackground } from "@/components/marketing/hero-promo-shader-background";
import { SmartImage } from "@/components/ui/smart-image";
import type { CatalogProduct } from "@/lib/catalog/models";
import {
  buildHeroPromoRenderContract,
  buildHeroPromoProductHref,
  getHeroPromoInitialCellHemispheres,
  type HeroPromoCarouselSnapshot,
  splitHeroPromoHeadline,
} from "@/lib/marketing/hero-promo-runtime";
import { compactGhostCtaClassName, solidCtaClassName } from "@/lib/ui";

import styles from "./hero-promo.module.css";

interface HeroPromoProps {
  topRow: CatalogProduct[];
  bottomRow: CatalogProduct[];
}

function HeroPromoCarousel({
  products,
  ariaLabel,
  frameLabel,
  dragCue,
  faceAssets,
  layout,
  showSlideFrame,
  carouselImageScale,
}: {
  products: CatalogProduct[];
  ariaLabel: string;
  frameLabel: string;
  dragCue: string;
  faceAssets: Array<{
    front: string;
    back: string;
  }>;
  layout: HeroPromoCarouselSnapshot;
  showSlideFrame: boolean;
  carouselImageScale: number;
}) {
  const carouselLayout = layout;
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cellHemispheres, setCellHemispheres] = useState<Array<"front" | "rear">>(() => getHeroPromoInitialCellHemispheres(carouselLayout));

  useEffect(() => {
    setCellHemispheres(getHeroPromoInitialCellHemispheres(carouselLayout));
  }, [carouselLayout]);

  const updateCarouselTransforms = useCallback(
    (progress: number) => {
      const carousel = carouselRef.current;

      if (!carousel) {
        return;
      }

      carousel.style.transform = carouselLayout.cylinder.getContainerTransform(progress);
      const cells = carousel.querySelectorAll<HTMLElement>(carouselLayout.selector);
      const nextHemispheres: Array<"front" | "rear"> = [];

      for (const [index, cell] of cells.entries()) {
        cell.style.transform = carouselLayout.cylinder.getCellTransform(index);
        const visualState = carouselLayout.cylinder.getCellVisualState(index, progress);
        const hemisphere = carouselLayout.cylinder.getCellHemisphere(index, progress);
        cell.style.opacity = `${visualState.opacity}`;
        cell.style.zIndex = `${visualState.zIndex}`;
        nextHemispheres.push(hemisphere);
      }

      setCellHemispheres((previous) => {
        if (previous.length !== nextHemispheres.length) {
          return nextHemispheres;
        }

        for (let index = 0; index < nextHemispheres.length; index += 1) {
          if (previous[index] !== nextHemispheres[index]) {
            return nextHemispheres;
          }
        }

        return previous;
      });
    },
    [carouselLayout],
  );

  const [sliderRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: carouselLayout.canSlide,
      drag: carouselLayout.drag,
      rubberband: false,
      renderMode: carouselLayout.renderMode,
      mode: carouselLayout.mode,
      selector: carouselLayout.selector,
      slides: carouselLayout.slides,
      created(slider) {
        updateCarouselTransforms(slider.track.details?.progress ?? 0);
        setIsReady(true);
      },
      updated(slider) {
        updateCarouselTransforms(slider.track.details?.progress ?? 0);
      },
      detailsChanged(slider) {
        updateCarouselTransforms(slider.track.details?.progress ?? 0);
      },
    },
  );

  const setSliderNode = useCallback(
    (node: HTMLDivElement | null) => {
      carouselRef.current = node;
      sliderRef(node);
    },
    [sliderRef],
  );

  return (
    <div className={`${styles.carouselFrame} ${isReady ? styles.carouselReady : styles.carouselLoading}`}>
      <div className={styles.carouselFrameHeader}>
        <span>{frameLabel}</span>
        <span className={styles.dragCue}>{dragCue}</span>
      </div>

      <div className={styles.wrapper} aria-label={ariaLabel}>
        <div
          className={styles.scene}
          style={{
            ["--hero-carousel-perspective" as string]: `${carouselLayout.cylinder.perspectivePx}px`,
            ["--hero-carousel-width" as string]: `${carouselLayout.scene.widthPx}px`,
            ["--hero-carousel-height" as string]: `${carouselLayout.scene.heightPx}px`,
            ["--hero-carousel-cell-width" as string]: `${carouselLayout.cylinder.cellWidthPx}px`,
            ["--hero-carousel-cell-height" as string]: `${carouselLayout.cylinder.cellHeightPx}px`,
          }}
        >
          <div ref={setSliderNode} className={`keen-slider ${styles.carousel}`}>
            {products.map((product, index) => {
              const slotAsset = faceAssets[index] ?? faceAssets[faceAssets.length - 1];
              const imageSrc = cellHemispheres[index] === "rear" ? slotAsset.back : slotAsset.front;
              const imageAlt = cellHemispheres[index] === "rear" ? `${product.alt} dorso` : product.alt;

              return (
                <div key={product.id} className={`keen-slider__slide hero-promo-carousel-cell ${styles.carouselCell}`}>
                <Link
                  href={buildHeroPromoProductHref(product.slug)}
                  aria-label={`Ver ${product.name}`}
                  data-track="hero-product"
                  className={`group flex h-full w-full flex-col items-center justify-center transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.68)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${styles.slideCard} ${showSlideFrame ? styles.premiumSlideFrame : ""}`}
                  style={{
                    ["--hero-carousel-image-scale" as string]: `${carouselImageScale}`,
                  }}
                >
                  <div className={`relative h-full w-full ${styles.cutoutImageWrap}`}>
                    <div className={styles.faceSwap}>
                      <SmartImage
                        src={imageSrc}
                        alt={imageAlt}
                        fill
                        className={`object-cover object-center ${styles.carouselImage}`}
                        sizes="(max-width: 639px) 72vw, (max-width: 1023px) 56vw, 360px"
                      />
                    </div>
                  </div>
                </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroPromo({ topRow, bottomRow }: HeroPromoProps) {
  const topCarouselProducts = useMemo(() => topRow.slice(0, 6), [topRow]);
  const bottomCarouselProducts = useMemo(() => bottomRow.slice(0, 6), [bottomRow]);

  const renderContract = buildHeroPromoRenderContract({
    topRowCount: topRow.length,
    bottomRowCount: bottomRow.length,
  });
  const headlineLines = splitHeroPromoHeadline(renderContract.headline);

  return (
    <section
      id="top"
      className={styles.heroShell}
      style={{
        ["--hero-min-height" as string]: `calc(${renderContract.layout.viewport.heightVh}svh - ${renderContract.layout.viewport.publicHeaderOffsetPx}px)`,
      }}
    >
      <div className={styles.heroShellInner}>
        <div className={styles.heroFrame}>
          <HeroPromoShaderBackground />
          <div className={styles.darkeningOverlay} />
          {renderContract.visual.continuationCue.showBottomFade ? (
            <div
              className={styles.continuationFade}
              style={{
                ["--hero-continuation-fade-color" as string]: renderContract.visual.continuationCue.fadeToBackgroundColor,
              }}
              aria-hidden="true"
            />
          ) : null}

          <div
            className={`${styles.heroGrid} relative z-10 grid gap-4 lg:items-center`}
            style={{
              ["--hero-info-panel-ratio" as string]: `${renderContract.layout.desktop.infoPanelWidthRatio}fr`,
            }}
          >
            <div
              className={styles.textContent}
              style={{
                ["--hero-text-inset-start-desktop" as string]: `${renderContract.visual.textInsetInlineStartPx.desktop}px`,
                ["--hero-text-inset-start-mobile" as string]: `${renderContract.visual.textInsetInlineStartPx.mobile}px`,
              }}
            >
              <p className={styles.brandEyebrow}>{renderContract.heroLabel}</p>
              <p className={styles.promoEyebrow}>{renderContract.promoLabel}</p>
              <h1 className={`${styles.headline} font-display text-white`}>
                {headlineLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < headlineLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </h1>
              <div className={`${styles.ctaBlock} flex flex-wrap gap-3 pt-1`}>
                <Link
                  href={renderContract.cta.href}
                  className={solidCtaClassName}
                  data-track={renderContract.cta.tracking.track}
                  data-promo={renderContract.cta.tracking.promo}
                  aria-label={renderContract.cta.ariaLabel}
                >
                  {renderContract.cta.label}
                </Link>
                <Link
                  href={renderContract.secondaryCta.href}
                  className={compactGhostCtaClassName}
                  data-track={renderContract.secondaryCta.tracking.track}
                  data-promo={renderContract.secondaryCta.tracking.promo}
                >
                  {renderContract.secondaryCta.label}
                </Link>
              </div>

              <div className={styles.supportingCopy}>
                <p className="text-sm font-semibold text-slate-100 sm:text-base">{renderContract.rules}</p>
                <p className="text-sm text-slate-300">{renderContract.disclosure}</p>
                <p className="text-[11px] tracking-[0.2em] text-white/60 uppercase">{renderContract.legal}</p>
              </div>
            </div>

            <div
              className={`${styles.carouselSet} w-full max-w-full justify-self-end`}
              style={{
                maxWidth: `${renderContract.layout.desktop.carouselMaxWidthPx}px`,
                display: "grid",
                gap: `${renderContract.visual.carouselStackGapPx}px`,
              }}
            >
              <HeroPromoCarousel
                products={topCarouselProducts}
                ariaLabel={renderContract.topCarousel.ariaLabel}
                frameLabel={renderContract.topCarousel.label}
                dragCue={renderContract.topCarousel.dragCue}
                faceAssets={renderContract.topCarousel.faceAssets}
                layout={renderContract.topCarousel.layout}
                showSlideFrame={renderContract.visual.showSlideFrame}
                carouselImageScale={renderContract.visual.railImageScale.top}
              />
              <HeroPromoCarousel
                products={bottomCarouselProducts}
                ariaLabel={renderContract.bottomCarousel.ariaLabel}
                frameLabel={renderContract.bottomCarousel.label}
                dragCue={renderContract.bottomCarousel.dragCue}
                faceAssets={renderContract.bottomCarousel.faceAssets}
                layout={renderContract.bottomCarousel.layout}
                showSlideFrame={renderContract.visual.showSlideFrame}
                carouselImageScale={renderContract.visual.railImageScale.bottom}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
