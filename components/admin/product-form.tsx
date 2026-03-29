"use client";

import { useActionState, useMemo, useState } from "react";

import { saveProductAction, type ProductFormState } from "@/app/admin/actions";
import { PRODUCT_STATE_HELPERS, PRODUCT_STATE_LABELS, SUPPORTED_PRODUCT_SIZES } from "@/lib/catalog/options";
import type { Brand, Category, ProductAvailability, ProductState } from "@/lib/catalog";
import { compactGhostCtaClassName, solidCtaClassName } from "@/lib/ui";

interface ProductFormProps {
  brands: Brand[];
  categories: Category[];
  initialProduct?: {
    id?: string;
    type: ProductAvailability;
    name: string;
    brandId: string;
    categoryId: string;
    priceArs: number;
    description: string;
    availabilityNote: string;
    state: ProductState;
    sourceUrl: string;
    imageUrls: string[];
    sizes: string[];
    variants: string[];
  };
}

const initialState: ProductFormState = {};

function parseClientLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function ProductForm({ brands, categories, initialProduct }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(saveProductAction, initialState);
  const [sourceUrl, setSourceUrl] = useState(initialProduct?.sourceUrl ?? "");
  const [imageUrls, setImageUrls] = useState((initialProduct?.imageUrls ?? []).join("\n"));
  const [sizes, setSizes] = useState<string[]>(initialProduct?.sizes ?? []);
  const [variants, setVariants] = useState((initialProduct?.variants ?? []).join("\n"));
  const [extractFeedback, setExtractFeedback] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedImages, setExtractedImages] = useState<string[]>(initialProduct?.imageUrls ?? []);
  const selectedImageUrls = useMemo(() => parseClientLines(imageUrls), [imageUrls]);

  function syncSelectedImages(nextSelectedImages: string[]) {
    setImageUrls(nextSelectedImages.join("\n"));
  }

  function handleToggleExtractedImage(url: string) {
    if (selectedImageUrls.includes(url)) {
      syncSelectedImages(selectedImageUrls.filter((item) => item !== url));
      return;
    }

    syncSelectedImages([...selectedImageUrls, url]);
  }

  function handleToggleSize(size: string) {
    setSizes((currentSizes) =>
      currentSizes.includes(size) ? currentSizes.filter((currentSize) => currentSize !== size) : [...currentSizes, size],
    );
  }

  async function handleExtractImages() {
    if (!sourceUrl.trim()) {
      setExtractFeedback("Pegá primero una URL de Yupoo.");
      return;
    }

    setExtracting(true);
    setExtractFeedback(null);

    const response = await fetch("/api/admin/yupoo-extract", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: sourceUrl.trim() }),
    });

    const payload = (await response.json()) as { images?: string[]; error?: string };

    if (!response.ok || !payload.images) {
      setExtractFeedback(payload.error ?? "No pudimos extraer imágenes de Yupoo.");
      setExtracting(false);
      return;
    }

    setExtractedImages(payload.images);
    syncSelectedImages(payload.images);
    setExtractFeedback(`Se encontraron ${payload.images.length} imágenes válidas. Elegí cuáles querés guardar.`);
    setExtracting(false);
  }

  return (
    <form action={formAction} className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <input type="hidden" name="productId" value={initialProduct?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium text-white">
            Tipo
          </label>
          <select
            id="type"
            name="type"
            defaultValue={initialProduct?.type ?? "stock"}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          >
            <option value="stock">Stock</option>
            <option value="encargue">Encargue</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="state" className="text-sm font-medium text-white">
            Estado
          </label>
          <select
            id="state"
            name="state"
            defaultValue={initialProduct?.state ?? "draft"}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          >
            <option value="draft">{PRODUCT_STATE_LABELS.draft}</option>
            <option value="published">{PRODUCT_STATE_LABELS.published}</option>
            <option value="paused">{PRODUCT_STATE_LABELS.paused}</option>
          </select>
          <p className="text-xs text-slate-400">
            <strong>{PRODUCT_STATE_LABELS.draft}:</strong> {PRODUCT_STATE_HELPERS.draft}
          </p>
          <p className="text-xs text-slate-400">
            <strong>{PRODUCT_STATE_LABELS.published}:</strong> {PRODUCT_STATE_HELPERS.published}
          </p>
          <p className="text-xs text-slate-400">
            <strong>{PRODUCT_STATE_LABELS.paused}:</strong> {PRODUCT_STATE_HELPERS.paused}
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="name" className="text-sm font-medium text-white">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={initialProduct?.name ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
          <p className="text-xs text-slate-400">El slug se genera automáticamente a partir del nombre.</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="brandId" className="text-sm font-medium text-white">
            Marca
          </label>
          <select
            id="brandId"
            name="brandId"
            defaultValue={initialProduct?.brandId ?? brands[0]?.id ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          >
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="categoryId" className="text-sm font-medium text-white">
            Categoría
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={initialProduct?.categoryId ?? categories[0]?.id ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="priceArs" className="text-sm font-medium text-white">
            Precio ARS
          </label>
          <input
            id="priceArs"
            name="priceArs"
            type="number"
            min={1}
            required
            defaultValue={initialProduct?.priceArs ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
        </div>

        <input type="hidden" name="availabilityNote" value="" />

        <div className="space-y-2 md:col-span-2 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
          <p className="text-sm font-medium text-white">WhatsApp del producto</p>
          <p className="text-sm leading-6 text-slate-300">
            El texto del botón y el mensaje final se generan solos según el tipo de producto y las selecciones que haga la clienta en la PDP.
            Acá cargás hechos del producto, no el copy final del chat.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="description" className="text-sm font-medium text-white">
            Descripción interna (opcional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={initialProduct?.description ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
          <p className="text-xs text-slate-400">Hoy no se muestra en cards ni en la PDP pública.</p>
        </div>

        <div className="space-y-3 md:col-span-2">
          <div className="space-y-2">
            <label htmlFor="sourceUrl" className="text-sm font-medium text-white">
              URL fuente / Yupoo
            </label>
            <input
              id="sourceUrl"
              name="sourceUrl"
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExtractImages}
              disabled={extracting}
              className={compactGhostCtaClassName}
            >
              {extracting ? "Extrayendo..." : "Probar extracción Yupoo"}
            </button>
            <p className="text-xs text-slate-400">
              Si falla, no bloquea el alta: podés guardar la URL y pegar imágenes manuales.
            </p>
          </div>

          {extractFeedback ? <p className="text-sm text-orange-100">{extractFeedback}</p> : null}

          {extractedImages.length > 0 ? (
            <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Vista previa de Yupoo</p>
                <p className="text-xs leading-5 text-slate-400">Marcá qué imágenes querés conservar antes de guardar el producto.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {extractedImages.map((url, index) => {
                  const isSelected = selectedImageUrls.includes(url);

                  return (
                    <label
                      key={url}
                      className={`space-y-3 rounded-[1.25rem] border p-3 transition ${
                        isSelected ? "border-orange-300/40 bg-orange-500/10" : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Yupoo ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleExtractedImage(url)}
                          className="mt-1"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-white">Imagen {index + 1}</p>
                          <p className="truncate text-xs text-slate-400">{url}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="imageUrls" className="text-sm font-medium text-white">
            Imágenes (una URL por línea)
          </label>
          <textarea
            id="imageUrls"
            name="imageUrls"
            rows={6}
            value={imageUrls}
            onChange={(event) => setImageUrls(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="space-y-3 md:col-span-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-white">Talles</label>
            <p className="text-xs text-slate-400">Marcá los talles que realmente ofrece este producto.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SUPPORTED_PRODUCT_SIZES.map((size) => {
              const checked = sizes.includes(size);

              return (
                <label
                  key={size}
                  className={`flex cursor-pointer items-center gap-3 rounded-[1.25rem] border px-4 py-3 transition ${
                    checked ? "border-orange-300/40 bg-orange-500/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="sizes"
                    value={size}
                    checked={checked}
                    onChange={() => handleToggleSize(size)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-white">{size}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="variants" className="text-sm font-medium text-white">
            Variantes (una por línea)
          </label>
          <textarea
            id="variants"
            name="variants"
            rows={4}
            value={variants}
            onChange={(event) => setVariants(event.target.value)}
            placeholder="Negro\nBlanco"
            className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
          <p className="text-xs text-slate-400">Opcional. Sirve para armar el mensaje de WhatsApp con color/modelo elegido.</p>
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isPending} className={`${solidCtaClassName} disabled:opacity-70`}>
          {isPending ? "Guardando..." : initialProduct ? "Guardar cambios" : "Crear producto"}
        </button>
        <a href="/admin/products" className={compactGhostCtaClassName}>
          Volver al listado
        </a>
      </div>
    </form>
  );
}
