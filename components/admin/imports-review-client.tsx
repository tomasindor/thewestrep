"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  getNextKeyboardImageIndex,
  popLastRejectUndo,
  pushRejectUndo,
  type RejectUndoEntry,
} from "@/lib/imports/admin-curation-ui-state";
import { compactGhostCtaClassName, compactSolidCtaClassName } from "@/lib/ui";

type ReviewState = "pending" | "approved" | "rejected";

interface ImportsReviewImage {
  id: string;
  importItemId: string;
  originalUrl: string;
  previewUrl: string;
  reviewState: ReviewState;
  isSizeGuide: boolean;
  order: number;
}

interface ImportsReviewItem {
  id: string;
  status: "pending" | "approved" | "rejected";
  sourceReference: string | null;
  productName: string | null;
  coverImageId: string | null;
  images: ImportsReviewImage[];
}

interface ImportsReviewClientProps {
  initialItems: ImportsReviewItem[];
}

function stateChipClassName(state: ReviewState) {
  if (state === "approved") {
    return "border border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
  }

  if (state === "rejected") {
    return "border border-red-300/40 bg-red-500/10 text-red-100";
  }

  return "border border-white/20 bg-white/5 text-slate-200";
}

function updateImageState(items: ImportsReviewItem[], imageId: string, nextState: ReviewState, importItemStatus: ImportsReviewItem["status"], coverImageId: string | null) {
  return items.map((item) => {
    const hasImage = item.images.some((image) => image.id === imageId);

    if (!hasImage) {
      return item;
    }

    return {
      ...item,
      status: importItemStatus,
      coverImageId,
      images: item.images.map((image) => (image.id === imageId ? { ...image, reviewState: nextState } : image)),
    };
  });
}

export function ImportsReviewClient({ initialItems }: ImportsReviewClientProps) {
  const [items, setItems] = useState(initialItems);
  const [undoStack, setUndoStack] = useState<RejectUndoEntry[]>([]);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const flatImages = useMemo(
    () => items.flatMap((item) => item.images.map((image) => ({ ...image, itemId: item.id, coverImageId: item.coverImageId }))),
    [items],
  );

  useEffect(() => {
    if (flatImages.length === 0) {
      setActiveImageIndex(0);
      return;
    }

    setActiveImageIndex((currentValue) => Math.min(currentValue, flatImages.length - 1));
  }, [flatImages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

      if (isTyping) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setActiveImageIndex((currentValue) => getNextKeyboardImageIndex({
          currentIndex: currentValue,
          total: flatImages.length,
          key: event.key,
        }));
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undoLastReject();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flatImages.length, undoStack]);

  async function sendAction(input: { imageId: string; action: "approve" | "reject" | "restore"; previousState?: ReviewState }) {
    setPendingImageId(input.imageId);
    setError(null);

    try {
      const response = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as {
        error?: string;
        data?: {
          imageId: string;
          nextState: ReviewState;
          previousState: ReviewState;
          importItemStatus: ImportsReviewItem["status"];
          coverImageId: string | null;
        };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo aplicar la acción de revisión.");
      }

      const { data } = payload;

      setItems((currentValue) => updateImageState(
        currentValue,
        data.imageId,
        data.nextState,
        data.importItemStatus,
        data.coverImageId,
      ));

      if (input.action === "reject") {
        setUndoStack((currentValue) => pushRejectUndo(currentValue, {
          imageId: data.imageId,
          previousState: data.previousState,
        }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo aplicar la acción.");
    } finally {
      setPendingImageId(null);
    }
  }

  async function undoLastReject() {
    const { last, remaining } = popLastRejectUndo(undoStack);

    if (!last) {
      return;
    }

    setUndoStack(remaining);
    await sendAction({ imageId: last.imageId, action: "restore", previousState: last.previousState });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        No hay imágenes importadas pendientes para revisar todavía.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs tracking-[0.25em] text-slate-400 uppercase">
        Navegación rápida: ← / → para moverte · Ctrl+Z para deshacer último descarte
      </p>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {flatImages.map((image, index) => {
          const isActive = index === activeImageIndex;
          const isPending = pendingImageId === image.id;
          const isCover = image.id === image.coverImageId;

          return (
            <article
              key={image.id}
              className={`space-y-3 rounded-[1.4rem] border bg-white/[0.03] p-3 transition ${
                isActive ? "border-[rgba(210,138,163,0.58)] ring-1 ring-[rgba(210,138,163,0.2)]" : "border-white/10"
              }`}
            >
              <div className="aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <Image
                  src={image.previewUrl || image.originalUrl}
                  alt="Imagen importada para revisión"
                  width={480}
                  height={600}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>

              <div className="flex flex-wrap gap-2 text-xs uppercase">
                <span className={`rounded-full px-2.5 py-1 ${stateChipClassName(image.reviewState)}`}>{image.reviewState}</span>
                {image.isSizeGuide ? <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2.5 py-1 text-sky-100">size-guide</span> : null}
                {isCover ? <span className="rounded-full border border-[#f1d2dc]/35 bg-[#f1d2dc]/10 px-2.5 py-1 text-[#f9e4ec]">cover auto</span> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={compactSolidCtaClassName}
                  onClick={() => sendAction({ imageId: image.id, action: "approve" })}
                  disabled={isPending}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className={compactGhostCtaClassName}
                  onClick={() => sendAction({ imageId: image.id, action: "reject" })}
                  disabled={isPending}
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  className={compactGhostCtaClassName}
                  onClick={() => sendAction({ imageId: image.id, action: "restore" })}
                  disabled={isPending}
                >
                  Restaurar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
