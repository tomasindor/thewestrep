"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import {
  applyBulkPromotionResultToQueue,
  buildReviewImageUrl,
  formatCarouselPositionLabel,
  getKeyboardReviewAction,
  getNextKeyboardImageIndex,
  popLastRejectUndo,
  pushRejectUndo,
  resolveBestActiveItemAfterImageMutation,
  resolvePrimaryQuickActions,
  type RejectUndoEntry,
} from "@/lib/imports/admin-curation-ui-state";
import { compactGhostCtaClassName, compactSolidCtaClassName } from "@/lib/ui";

type ReviewState = "pending" | "approved" | "rejected";

interface ImportsReviewImage {
  id: string;
  importItemId: string;
  sourceUrl: string;
  previewUrl: string | null;
  reviewState: ReviewState;
  isSizeGuide: boolean;
  order: number;
}

interface ImportsReviewItem {
  id: string;
  status: "pending" | "approved" | "rejected" | "promoted" | "media_failed";
  mediaStatus: "pending" | "ready" | "failed";
  sourceReference: string | null;
  finalName: string | null;
  finalPrice: number | null;
  brand: string | null;
  activeImageCount: number;
  productName: string | null;
  coverImageId: string | null;
  promotionEligible: boolean;
  promotionBlockedReason: string | null;
  images: ImportsReviewImage[];
}

interface ImportsReviewClientProps {
  initialItems: ImportsReviewItem[];
}

function updateImageState(items: ImportsReviewItem[], imageId: string, nextState: ReviewState, importItemStatus: ImportsReviewItem["status"], coverImageId: string | null, nextIsSizeGuide: boolean) {
  return items.map((item) => {
    const hasImage = item.images.some((image) => image.id === imageId);

    if (!hasImage) {
      return item;
    }

    const nextImages = item.images.map((image) => (image.id === imageId
      ? { ...image, reviewState: nextState, isSizeGuide: nextIsSizeGuide }
      : image));
    const nextActiveCount = nextImages.filter((image) => image.reviewState !== "rejected").length;
    const usefulCount = nextImages.filter((image) => image.reviewState !== "rejected" && !image.isSizeGuide).length;
    const nextPromotionEligible = usefulCount >= 2;

    return {
      ...item,
      status: importItemStatus,
      mediaStatus: item.mediaStatus,
      coverImageId,
      activeImageCount: nextActiveCount,
      promotionEligible: nextPromotionEligible,
      promotionBlockedReason: nextPromotionEligible ? null : "insufficient useful images",
      images: nextImages,
    };
  });
}

export function ImportsReviewClient({ initialItems }: ImportsReviewClientProps) {
  const [items, setItems] = useState(initialItems);
  const [activeItemId, setActiveItemId] = useState<string | null>(initialItems[0]?.id ?? null);
  const [activeImageIndexByItem, setActiveImageIndexByItem] = useState<Record<string, number>>({});
  const [undoStack, setUndoStack] = useState<RejectUndoEntry[]>([]);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
const [promoting, setPromoting] = useState(false);
const [clearingQueue, setClearingQueue] = useState(false);
const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
const [editingField, setEditingField] = useState<"name" | "price" | "category" | null>(null);
const [editValue, setEditValue] = useState<string>("");
const [error, setError] = useState<string | null>(null);
const [promotionMessage, setPromotionMessage] = useState<string | null>(null);

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId) ?? items[0] ?? null,
    [activeItemId, items],
  );

  const activeImageIndex = activeItem
    ? Math.min(
      Math.max(activeImageIndexByItem[activeItem.id] ?? 0, 0),
      Math.max(0, activeItem.images.filter((image) => image.reviewState !== "rejected").length - 1),
    )
    : 0;

  const activeImages = activeItem?.images.filter((image) => image.reviewState !== "rejected") ?? [];
  const currentImage = activeImages[activeImageIndex] ?? null;

  useEffect(() => {
    if (!activeItemId && items[0]) {
      setActiveItemId(items[0].id);
    }
  }, [activeItemId, items]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

      if (isTyping || !activeItem) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setActiveImageIndexByItem((currentValue) => ({
          ...currentValue,
          [activeItem.id]: getNextKeyboardImageIndex({
            currentIndex: currentValue[activeItem.id] ?? 0,
            total: activeItem.images.filter((image) => image.reviewState !== "rejected").length,
            key: event.key,
          }),
        }));
        return;
      }

      const keyboardAction = getKeyboardReviewAction(event.key);

      if (keyboardAction === "reject" && currentImage && pendingImageId !== currentImage.id) {
        event.preventDefault();
        void sendImageAction({
          imageId: currentImage.id,
          action: "reject",
          previousState: currentImage.reviewState,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeItem, currentImage, pendingImageId]);

  async function sendImageAction(input: { imageId: string; action: "reject" | "restore" | "toggle-size-guide"; previousState?: ReviewState }) {
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
          nextIsSizeGuide: boolean;
        };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo aplicar la acción de revisión.");
      }

      const { data } = payload;

      setItems((currentValue) => {
        const updatedItems = updateImageState(
          currentValue,
          data.imageId,
          data.nextState,
          data.importItemStatus,
          data.coverImageId,
          data.nextIsSizeGuide,
        );

        setActiveItemId((currentActiveId) => resolveBestActiveItemAfterImageMutation(updatedItems, currentActiveId));
        return updatedItems;
      });

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
    await sendImageAction({ imageId: last.imageId, action: "restore", previousState: last.previousState });
  }

  async function promoteItems(itemIds: string[], mode: "bulk-promote" | "promote-item") {
    if (itemIds.length === 0) {
      return;
    }

    setPromoting(true);
    setError(null);
    setPromotionMessage(null);

    try {
      const response = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: mode === "promote-item"
          ? JSON.stringify({ action: mode, itemId: itemIds[0] })
          : JSON.stringify({ action: mode, itemIds }),
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: { promotedCount: number; promotedItemIds: string[]; blocked: Array<{ itemId: string; reason: string }> };
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "No se pudo promover en bloque.");
      }

      setItems((currentItems) => {
        const updated = applyBulkPromotionResultToQueue({
          items: currentItems,
          activeItemId,
        }, payload.data?.promotedItemIds ?? []);

        setActiveItemId(updated.activeItemId);
        return updated.items;
      });

      const blockedSummary = payload.data.blocked
        .map((entry) => `${entry.itemId}: ${entry.reason}`)
        .join(" · ");
      setPromotionMessage(`Promovidos: ${payload.data.promotedCount} · Bloqueados: ${payload.data.blocked.length}${blockedSummary ? ` · ${blockedSummary}` : ""}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo promover en bloque.");
    } finally {
      setPromoting(false);
    }
  }

  async function promoteEligibleProducts() {
    await promoteItems(items.map((item) => item.id), "bulk-promote");
  }

  async function promoteSingleProduct(itemId: string) {
    await promoteItems([itemId], "promote-item");
  }

async function clearImportsQueue() {
  const confirmed = window.confirm("¿Querés vaciar toda la cola de importaciones? Esto solo borra staging/import queue y no toca catálogo.");

  if (!confirmed) {
    return;
  }

  setClearingQueue(true);
  setError(null);
  setPromotionMessage(null);

  try {
    const response = await fetch("/api/admin/imports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear-queue" }),
    });
    const payload = (await response.json()) as {
      error?: string;
      data?: { deletedJobs: number };
    };

    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "No se pudo vaciar la cola de importaciones.");
    }

    setItems([]);
    setActiveItemId(null);
    setPromotionMessage(`Cola vaciada. Jobs eliminados: ${payload.data.deletedJobs}.`);
  } catch (requestError) {
    setError(requestError instanceof Error ? requestError.message : "No se pudo vaciar la cola de importaciones.");
  } finally {
    setClearingQueue(false);
  }
}

async function deleteSingleProduct(itemId: string) {
  const confirmed = window.confirm("¿Querés eliminar este producto de la cola de importación? Esta acción no se puede deshacer.");

  if (!confirmed) {
    return;
  }

  setDeletingItemId(itemId);
  setError(null);

  try {
    const response = await fetch("/api/admin/imports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "delete-item", itemId }),
    });
    const payload = (await response.json()) as {
      error?: string;
      data?: { deleted: boolean; importItemId?: string };
    };

    if (!response.ok || !payload.data?.deleted) {
      throw new Error(payload.error ?? "No se pudo eliminar el producto.");
    }

    // Remove the item from the list and update active item
    setItems((currentItems) => {
      const updatedItems = currentItems.filter((item) => item.id !== itemId);
      
      // If we deleted the active item, switch to the first available item
      if (activeItemId === itemId) {
        setActiveItemId(updatedItems.length > 0 ? updatedItems[0].id : null);
      }
      
      return updatedItems;
    });

    setPromotionMessage(`Producto eliminado de la cola.`);
  } catch (requestError) {
    setError(requestError instanceof Error ? requestError.message : "No se pudo eliminar el producto.");
  } finally {
    setDeletingItemId(null);
  }
}

async function updateProductData(itemId: string, data: { finalName?: string; finalPrice?: number; categoryName?: string }) {
  setUpdatingItemId(itemId);
  setError(null);

  try {
    const response = await fetch("/api/admin/imports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update-item", itemId, updateData: data }),
    });
    const payload = (await response.json()) as {
      error?: string;
      data?: { updated: boolean };
    };

    if (!response.ok || !payload.data?.updated) {
      throw new Error(payload.error ?? "No se pudo actualizar el producto.");
    }

    // Update the item in the list
    setItems((currentItems) => {
      return currentItems.map((item) => {
        if (item.id !== itemId) return item;
        
        return {
          ...item,
          finalName: data.finalName ?? item.finalName,
          finalPrice: data.finalPrice ?? item.finalPrice,
          brand: data.categoryName !== undefined ? data.categoryName : item.brand,
        };
      });
    });
  } catch (requestError) {
    setError(requestError instanceof Error ? requestError.message : "No se pudo actualizar el producto.");
  } finally {
    setUpdatingItemId(null);
  }
}

  if (items.length === 0 || !activeItem) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        No hay productos importados pendientes para revisar todavía.
      </div>
    );
  }

  const quickActions = currentImage
    ? resolvePrimaryQuickActions({
      reviewState: currentImage.reviewState,
      isSizeGuide: currentImage.isSizeGuide,
    })
    : null;

  const isPending = currentImage ? pendingImageId === currentImage.id : false;
  const isCover = currentImage ? currentImage.id === activeItem.coverImageId : false;
  const activeProductIndex = items.findIndex((item) => item.id === activeItem.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tracking-[0.25em] text-slate-400 uppercase">Producto a producto · Navegación con ← / →</p>
        <div className="flex items-center gap-2">
          <button type="button" className={compactGhostCtaClassName} onClick={undoLastReject}>
            Deshacer descarte
          </button>
          <button
            type="button"
            className={compactGhostCtaClassName}
            onClick={clearImportsQueue}
            disabled={promoting || clearingQueue}
          >
            Vaciar cola completa
          </button>
          <button type="button" className={compactSolidCtaClassName} onClick={promoteEligibleProducts} disabled={promoting}>
            Promover elegibles
          </button>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}
      {promotionMessage ? <p className="rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{promotionMessage}</p> : null}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-2 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-3">
          {items.map((item, index) => (
            <div key={item.id} className={`space-y-2 rounded-xl border px-3 py-2 ${item.id === activeItem.id ? "border-[#d28aa3]/70 bg-[#d28aa3]/10" : "border-white/10 bg-white/0"}`}>
              <button
                type="button"
                className="w-full text-left text-sm text-slate-300 transition"
                onClick={() => setActiveItemId(item.id)}
              >
                <p className="font-medium text-white">{index + 1}. {item.finalName ?? item.productName ?? "Sin nombre"}</p>
                <p className="text-xs text-slate-400">{item.activeImageCount} imágenes activas · {item.promotionEligible ? "elegible" : "bloqueado"} · media {item.mediaStatus}</p>
              </button>
<div className="flex flex-wrap gap-2">
  <button
    type="button"
    className={compactGhostCtaClassName}
    disabled={promoting || (deletingItemId === item.id)}
    onClick={() => deleteSingleProduct(item.id)}
  >
    {deletingItemId === item.id ? "Eliminando..." : "Eliminar"}
  </button>
  <button
    type="button"
    className={compactGhostCtaClassName}
    disabled={promoting}
    onClick={() => promoteSingleProduct(item.id)}
  >
    Promover este producto
  </button>
</div>
</div>
))}
</aside>

<article className="space-y-4 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
<header className="space-y-3">
<p className="text-xs tracking-[0.2em] text-slate-400 uppercase">Producto {activeProductIndex + 1} de {items.length}</p>
<p className="text-xs text-slate-400">{activeItem.sourceReference ?? "Sin referencia de origen"}</p>

<div className="grid grid-cols-2 gap-4">
  {/* Nombre */}
  <div className="space-y-1">
    <label className="text-xs text-slate-400">Nombre</label>
    {editingField === "name" ? (
      <input
        type="text"
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-[#d28aa3] focus:outline-none"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          if (editValue.trim() && activeItem) {
            updateProductData(activeItem.id, { finalName: editValue.trim() });
          }
          setEditingField(null);
          setEditValue("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && editValue.trim() && activeItem) {
            updateProductData(activeItem.id, { finalName: editValue.trim() });
            setEditingField(null);
            setEditValue("");
          } else if (e.key === "Escape") {
            setEditingField(null);
            setEditValue("");
          }
        }}
        autoFocus
      />
    ) : (
      <button
        type="button"
        className="w-full text-left text-sm text-white hover:text-[#d28aa3] transition"
        onClick={() => {
          setEditingField("name");
          setEditValue(activeItem.finalName ?? activeItem.productName ?? "");
        }}
      >
        {activeItem.finalName ?? activeItem.productName ?? "Sin nombre"}
      </button>
    )}
  </div>

  {/* Precio */}
  <div className="space-y-1">
    <label className="text-xs text-slate-400">Precio (ARS)</label>
    {editingField === "price" ? (
      <input
        type="number"
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-[#d28aa3] focus:outline-none"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          const price = Number(editValue);
          if (price > 0 && activeItem) {
            updateProductData(activeItem.id, { finalPrice: price });
          }
          setEditingField(null);
          setEditValue("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && editValue && activeItem) {
            const price = Number(editValue);
            if (price > 0) {
              updateProductData(activeItem.id, { finalPrice: price });
            }
            setEditingField(null);
            setEditValue("");
          } else if (e.key === "Escape") {
            setEditingField(null);
            setEditValue("");
          }
        }}
        autoFocus
      />
    ) : (
      <button
        type="button"
        className="w-full text-left text-sm text-white hover:text-[#d28aa3] transition"
        onClick={() => {
          setEditingField("price");
          setEditValue(String(activeItem.finalPrice ?? 0));
        }}
      >
        {typeof activeItem.finalPrice === "number" ? `$${activeItem.finalPrice}` : "Sin precio"}
      </button>
    )}
  </div>

  {/* Categoría/Marca */}
  <div className="space-y-1">
    <label className="text-xs text-slate-400">Categoría/Marca</label>
    {editingField === "category" ? (
      <input
        type="text"
        className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white focus:border-[#d28aa3] focus:outline-none"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          if (editValue.trim() && activeItem) {
            updateProductData(activeItem.id, { categoryName: editValue.trim() });
          }
          setEditingField(null);
          setEditValue("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && editValue.trim() && activeItem) {
            updateProductData(activeItem.id, { categoryName: editValue.trim() });
            setEditingField(null);
            setEditValue("");
          } else if (e.key === "Escape") {
            setEditingField(null);
            setEditValue("");
          }
        }}
        autoFocus
      />
    ) : (
      <button
        type="button"
        className="w-full text-left text-sm text-white hover:text-[#d28aa3] transition"
        onClick={() => {
          setEditingField("category");
          setEditValue(activeItem.brand ?? "");
        }}
      >
        {activeItem.brand ?? "Sin marca"}
      </button>
    )}
  </div>

  {/* Info */}
  <div className="space-y-1">
    <label className="text-xs text-slate-400">Imágenes activas</label>
    <p className="text-sm text-slate-300">{activeItem.activeImageCount}</p>
  </div>
</div>
</header>

          {currentImage ? (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <Image
                  src={buildReviewImageUrl({ sourceUrl: currentImage.sourceUrl, previewUrl: currentImage.previewUrl })}
                  alt="Imagen importada"
                  width={1200}
                  height={900}
                  className="h-full w-full object-contain"
                  unoptimized
                />
                <span className="absolute top-3 right-3 rounded-full border border-white/25 bg-black/50 px-2 py-1 text-xs font-semibold text-white">
                  {formatCarouselPositionLabel({ currentIndex: activeImageIndex, total: activeImages.length })}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={compactGhostCtaClassName}
                  onClick={() => setActiveImageIndexByItem((currentValue) => ({
                    ...currentValue,
                    [activeItem.id]: getNextKeyboardImageIndex({
                      currentIndex: activeImageIndex,
                      total: activeImages.length,
                      key: "ArrowLeft",
                    }),
                  }))}
                >
                  ← Anterior
                </button>

                <p className="text-xs text-slate-300">Imagen {formatCarouselPositionLabel({ currentIndex: activeImageIndex, total: activeImages.length })}</p>

                <button
                  type="button"
                  className={compactGhostCtaClassName}
                  onClick={() => setActiveImageIndexByItem((currentValue) => ({
                    ...currentValue,
                    [activeItem.id]: getNextKeyboardImageIndex({
                      currentIndex: activeImageIndex,
                      total: activeImages.length,
                      key: "ArrowRight",
                    }),
                  }))}
                >
                  Siguiente →
                </button>
              </div>

              <div className="flex flex-wrap gap-2 text-xs uppercase">
                <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-slate-200">{currentImage.reviewState}</span>
                {currentImage.isSizeGuide ? <span className="rounded-full border border-sky-300/35 bg-sky-500/10 px-2.5 py-1 text-sky-100">size-guide</span> : null}
                {isCover ? <span className="rounded-full border border-[#f1d2dc]/35 bg-[#f1d2dc]/10 px-2.5 py-1 text-[#f9e4ec]">cover auto</span> : null}
              </div>

              <div data-testid="active-image-strip" className="flex flex-wrap gap-2">
                {activeImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    data-testid={`active-strip-image-${image.id}`}
                    className={compactGhostCtaClassName}
                    onClick={() => setActiveImageIndexByItem((currentValue) => ({
                      ...currentValue,
                      [activeItem.id]: index,
                    }))}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={compactGhostCtaClassName}
                  disabled={isPending || !quickActions}
                  onClick={() => sendImageAction({
                    imageId: currentImage.id,
                    action: quickActions?.reviewAction ?? "reject",
                    previousState: currentImage.reviewState,
                  })}
                >
                  {quickActions?.reviewAction === "reject" ? "Rechazar imagen" : "Restaurar imagen"}
                </button>
                <button
                  type="button"
                  className={compactSolidCtaClassName}
                  disabled={isPending || !quickActions}
                  onClick={() => sendImageAction({ imageId: currentImage.id, action: "toggle-size-guide" })}
                >
                  {quickActions?.sizeGuideAction === "mark-size-guide" ? "Marcar size-guide" : "Quitar size-guide"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Este producto se quedó sin imágenes activas para revisión. La cola sigue intacta; seleccioná otro producto o restaurá imágenes descartadas.
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
