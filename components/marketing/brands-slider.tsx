'use client';

import type { KeenSliderPlugin } from "keen-slider";
import { useKeenSlider } from "keen-slider/react";
import Link from "next/link";
import { useMemo } from "react";

import { SmartImage } from "@/components/ui/smart-image";
import type { HomepageBrandSpotlight } from "@/lib/catalog/models";

import styles from "./brands-slider.module.css";

type BrandsSliderProps = {
  brands: HomepageBrandSpotlight[];
};

const CONTINUOUS_RAIL_PIXELS_PER_SECOND = 48;

function continuousAutoplayPlugin(pixelsPerSecond = CONTINUOUS_RAIL_PIXELS_PER_SECOND): KeenSliderPlugin {
  return (slider) => {
    let animationFrame: number | null = null;
    let lastFrame = 0;

    const stop = () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      lastFrame = 0;
    };

    const step = (timestamp: number) => {
      if (!slider.track.details) {
        animationFrame = requestAnimationFrame(step);
        return;
      }

      if (lastFrame !== 0) {
        const delta = Math.min(timestamp - lastFrame, 64);
        const viewportSize = slider.size || slider.container.clientWidth;

        if (viewportSize > 0) {
          const distancePerMillisecond = pixelsPerSecond / viewportSize / 1000;
          slider.track.add(delta * distancePerMillisecond);
        }
      }

      lastFrame = timestamp;
      animationFrame = requestAnimationFrame(step);
    };

    const start = () => {
      stop();

      if (!slider.options.loop) {
        return;
      }

      animationFrame = requestAnimationFrame(step);
    };

    slider.on("created", () => {
      start();
    });

    slider.on("dragStarted", stop);
    slider.on("animationEnded", start);
    slider.on("updated", start);
    slider.on("destroyed", () => {
      stop();
    });
  };
}

export function BrandsSlider({ brands }: BrandsSliderProps) {
  const imageBrands = useMemo(() => brands.filter((brand) => Boolean(brand.image)), [brands]);
  const canSlide = imageBrands.length > 1;
  const mobilePerView = Math.min(imageBrands.length, 2.05);
  const tabletPerView = Math.min(imageBrands.length, 2.5);
  const desktopPerView = Math.min(imageBrands.length, 5);

  const [sliderRef] = useKeenSlider<HTMLDivElement>(
    {
      loop: canSlide,
      drag: canSlide,
      rubberband: false,
      renderMode: "performance",
      slides: {
        origin: "auto",
        perView: mobilePerView,
        spacing: 12,
      },
      breakpoints: {
        "(min-width: 640px)": {
          slides: {
            origin: "auto",
            perView: tabletPerView,
            spacing: 24,
          },
        },
        "(min-width: 1024px)": {
          slides: {
            origin: "auto",
            perView: desktopPerView,
            spacing: 20,
          },
        },
      },
    },
    canSlide ? [continuousAutoplayPlugin()] : [],
  );

  if (imageBrands.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden py-2">
      <div ref={sliderRef} className={`keen-slider ${styles.slider}`}>
        {imageBrands.map((brand) => (
          <div key={brand.id} className={`keen-slider__slide ${styles.slide}`}>
            <Link
              href={brand.href}
              aria-label={`Ver catálogo de ${brand.name}`}
              title={brand.name}
              className="group flex min-h-[7.5rem] w-full items-center justify-center px-1 py-3 transition duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.62)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:min-h-[9.5rem] sm:px-2 sm:py-4 lg:min-h-[10.5rem]"
            >
              <div className="relative h-20 w-full max-w-[9rem] sm:h-32 sm:max-w-[16rem] lg:h-36 lg:max-w-[18rem]">
                <SmartImage
                  src={brand.image!}
                  alt={brand.alt}
                  fill
                  className="object-contain object-center transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 639px) 44vw, (max-width: 1023px) 40vw, 20vw"
                />

                <span className="pointer-events-none absolute inset-x-4 bottom-2 inline-flex translate-y-1 justify-center opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                  <span className="rounded-full border border-white/12 bg-slate-950/88 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.22em] text-white/82 shadow-[0_18px_40px_rgba(2,6,23,0.42)] backdrop-blur-md sm:text-[0.72rem]">
                    {brand.name}
                  </span>
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
