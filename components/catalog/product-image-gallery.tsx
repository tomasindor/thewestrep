"use client";

import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { SmartImage } from "@/components/ui/smart-image";
import type { ProductImage } from "@/lib/catalog/types";
import { getProductImageUrlForContext } from "@/lib/media/product-images";

interface ProductImageGalleryProps {
  images: ProductImage[];
  fallbackAlt: string;
}

function getNextIndex(currentIndex: number, total: number, direction: 1 | -1) {
  return (currentIndex + direction + total) % total;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const LIGHTBOX_HOVER_ZOOM_SCALE = 1.9;
const THUMBNAIL_SCROLL_STEP = 280;

export function ProductImageGallery({ images, fallbackAlt }: ProductImageGalleryProps) {
  const galleryId = useId();
  const normalizedImages = useMemo(() => images.filter((image) => image.src), [images]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [supportsHoverZoom, setSupportsHoverZoom] = useState(false);
  const [hoverZoomPosition, setHoverZoomPosition] = useState({ x: 50, y: 50, active: false });
  const lightboxThumbnailRailRef = useRef<HTMLDivElement | null>(null);

  const selectedImage = normalizedImages[selectedIndex] ?? normalizedImages[0];
  const hasMultipleImages = normalizedImages.length > 1;
  const selectedImageSrc = selectedImage ? getProductImageUrlForContext(selectedImage, "detail") : "";
  const selectedLightboxImageSrc = selectedImage ? getProductImageUrlForContext(selectedImage, "lightbox") : "";

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHoverZoomPosition({ x: 50, y: 50, active: false });
        setIsLightboxOpen(false);
        return;
      }

      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setHoverZoomPosition((currentValue) => ({ ...currentValue, active: false }));
        setSelectedIndex((currentIndex) => getNextIndex(currentIndex, normalizedImages.length, -1));
      }

      if (event.key === "ArrowRight") {
        setHoverZoomPosition((currentValue) => ({ ...currentValue, active: false }));
        setSelectedIndex((currentIndex) => getNextIndex(currentIndex, normalizedImages.length, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, isLightboxOpen, normalizedImages.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateHoverZoomCapability = () => setSupportsHoverZoom(mediaQuery.matches);

    updateHoverZoomCapability();
    mediaQuery.addEventListener("change", updateHoverZoomCapability);

    return () => mediaQuery.removeEventListener("change", updateHoverZoomCapability);
  }, []);

  useEffect(() => {
    const thumbnailRail = lightboxThumbnailRailRef.current;

    if (!thumbnailRail || !isLightboxOpen) {
      return;
    }

    const selectedThumbnail = thumbnailRail.querySelector<HTMLButtonElement>(`[data-lightbox-thumb-index="${selectedIndex}"]`);

    selectedThumbnail?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [isLightboxOpen, selectedIndex]);

  const scrollLightboxThumbnails = (direction: 1 | -1) => {
    lightboxThumbnailRailRef.current?.scrollBy({
      left: direction * THUMBNAIL_SCROLL_STEP,
      behavior: "smooth",
    });
  };

  if (!selectedImage) {
    return null;
  }

  const handleSelectIndex = (index: number) => {
    setSelectedIndex(index);
    setHoverZoomPosition({ x: 50, y: 50, active: false });
  };

  const openLightbox = () => {
    setIsLightboxOpen(true);
    setHoverZoomPosition({ x: 50, y: 50, active: false });
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setHoverZoomPosition({ x: 50, y: 50, active: false });
  };

  const handleLightboxPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!supportsHoverZoom) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100);

    setHoverZoomPosition({ x, y, active: true });
  };

  return (
    <>
      <div className="flex h-full w-full min-w-0 flex-col gap-4 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.018))] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.3)] ring-1 ring-white/6 sm:p-4 lg:grid lg:grid-cols-[5.75rem_minmax(0,1fr)] lg:items-stretch lg:gap-4">
      <div className="relative order-1 min-w-0 lg:order-2 min-[1480px]:col-start-2">
        <div
          className="group relative aspect-[4/5] min-h-[23rem] w-full overflow-hidden rounded-[1.55rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_45%),rgba(0,0,0,0.24)] sm:min-h-[31rem] lg:min-h-[38rem] xl:min-h-[42rem]"
        >
          <button
            type="button"
            onClick={openLightbox}
            className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
            aria-haspopup="dialog"
            aria-label="Abrir imagen ampliada del producto"
          >
            <span className="absolute -inset-px overflow-hidden [transform:translateZ(0)]">
              <SmartImage
                src={selectedImageSrc}
                alt={selectedImage.alt || fallbackAlt}
                fill
                className="object-contain p-4 [transform:translateZ(0)_scale(1.004)] transition duration-300 group-hover:scale-[1.018] sm:p-6 xl:p-8"
                sizes="(max-width: 1024px) 100vw, (max-width: 1479px) 60vw, 44vw"
                priority
              />
            </span>
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_48%)] opacity-80 transition duration-300 group-hover:opacity-100" />
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
            <span className="rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-white/72 uppercase backdrop-blur-sm">
              Galería
            </span>
            {hasMultipleImages ? (
              <span className="rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-white/72 uppercase backdrop-blur-sm">
                {selectedIndex + 1} / {normalizedImages.length}
              </span>
            ) : null}
          </div>

        </div>
      </div>

      {hasMultipleImages ? (
        <div
          id={galleryId}
          className="order-2 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:order-1 lg:max-h-[42rem] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0 min-[1480px]:col-start-1"
          aria-live="polite"
        >
          {normalizedImages.map((image, index) => {
            const isSelected = index === selectedIndex;

            return (
              <button
                key={image.id}
                type="button"
                onClick={() => handleSelectIndex(index)}
                className={`relative aspect-square min-w-[5.25rem] shrink-0 overflow-hidden rounded-[1.2rem] border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b] sm:min-w-[5.75rem] lg:min-h-[5.75rem] lg:min-w-0 ${
                  isSelected
                    ? "border-[rgba(210,138,163,0.72)] bg-white/10 shadow-[0_14px_32px_rgba(0,0,0,0.24)] ring-1 ring-[rgba(210,138,163,0.22)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/24 hover:bg-white/[0.06]"
                }`}
                aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length}`}
                aria-pressed={isSelected}
              >
                <SmartImage
                  src={getProductImageUrlForContext(image, "detail")}
                  alt=""
                  fill
                  className="object-contain p-2.5"
                  sizes="96px"
                />
                {isSelected ? (
                  <>
                    <span className="absolute inset-0 border border-[rgba(210,138,163,0.46)]" />
                    <span className="absolute inset-x-3 bottom-2 h-0.5 rounded-full bg-[rgba(236,203,214,0.88)]" />
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada del producto"
          onClick={closeLightbox}
        >
          <div className="absolute inset-0 bg-[rgba(4,6,10,0.82)] backdrop-blur-md" />

          <div
            className="relative z-10 flex w-full max-w-6xl flex-col gap-4 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,28,0.96),rgba(7,9,14,0.98))] p-3 shadow-[0_36px_120px_rgba(0,0,0,0.55)] ring-1 ring-white/10 sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-1 sm:px-2">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-white/72 uppercase">
                  Vista ampliada
                </span>
                {hasMultipleImages ? (
                  <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-white/72 uppercase">
                    {selectedIndex + 1} / {normalizedImages.length}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-xl text-white transition hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                  aria-label="Cerrar vista ampliada"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            </div>

            <div
              className={`relative h-[70vh] min-h-[22rem] w-full overflow-hidden rounded-[1.7rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_45%),rgba(0,0,0,0.34)] ${supportsHoverZoom ? "cursor-zoom-in" : "cursor-default"}`}
              onPointerEnter={() => {
                if (supportsHoverZoom) {
                  setHoverZoomPosition((currentValue) => ({ ...currentValue, active: true }));
                }
              }}
              onPointerMove={handleLightboxPointerMove}
              onPointerLeave={() => setHoverZoomPosition((currentValue) => ({ ...currentValue, active: false }))}
            >
              <div className="relative h-full w-full">
                <SmartImage
                  src={selectedLightboxImageSrc}
                  alt={selectedImage.alt || fallbackAlt}
                  fill
                  className="object-contain p-4 transition-transform duration-200 ease-out will-change-transform sm:p-8"
                  sizes="100vw"
                  priority
                  style={supportsHoverZoom && hoverZoomPosition.active
                    ? {
                        transform: `scale(${LIGHTBOX_HOVER_ZOOM_SCALE})`,
                        transformOrigin: `${hoverZoomPosition.x}% ${hoverZoomPosition.y}%`,
                      }
                    : undefined}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(4,6,10,0.78))] p-4" />
            </div>

            {hasMultipleImages ? (
              <div className="flex flex-col gap-3 px-1 pb-1 sm:px-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectIndex(getNextIndex(selectedIndex, normalizedImages.length, -1))}
                    className="inline-flex min-w-[7.5rem] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[11px] font-medium tracking-[0.22em] text-white/78 uppercase transition hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                    aria-label="Ver imagen anterior en la vista ampliada"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectIndex(getNextIndex(selectedIndex, normalizedImages.length, 1))}
                    className="inline-flex min-w-[7.5rem] items-center justify-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[11px] font-medium tracking-[0.22em] text-white/78 uppercase transition hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                    aria-label="Ver imagen siguiente en la vista ampliada"
                  >
                    Siguiente
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => scrollLightboxThumbnails(-1)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-lg text-white/82 transition hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                    aria-label="Desplazar miniaturas hacia la izquierda"
                  >
                    <span aria-hidden="true">←</span>
                  </button>

                  <div
                    ref={lightboxThumbnailRailRef}
                    className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1 [scrollbar-width:none]"
                    aria-live="polite"
                  >
                    {normalizedImages.map((image, index) => {
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          key={`${image.id}-lightbox`}
                          type="button"
                          onClick={() => handleSelectIndex(index)}
                          data-lightbox-thumb-index={index}
                          className={`relative aspect-square min-w-[5rem] shrink-0 overflow-hidden rounded-[1.15rem] border transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b] ${
                            isSelected
                              ? "border-[rgba(210,138,163,0.72)] bg-white/10 shadow-[0_14px_32px_rgba(0,0,0,0.24)] ring-1 ring-[rgba(210,138,163,0.22)]"
                              : "border-white/10 bg-white/[0.03] hover:border-white/24 hover:bg-white/[0.06]"
                          }`}
                          aria-label={`Ver imagen ${index + 1} de ${normalizedImages.length} en la vista ampliada`}
                          aria-pressed={isSelected}
                        >
                          <SmartImage
                            src={getProductImageUrlForContext(image, "detail")}
                            alt=""
                            fill
                            className="object-contain p-2.5"
                            sizes="88px"
                          />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollLightboxThumbnails(1)}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-lg text-white/82 transition hover:border-white/25 hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(210,138,163,0.8)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06070b]"
                    aria-label="Desplazar miniaturas hacia la derecha"
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
