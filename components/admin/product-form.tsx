"use client";

import { useActionState, useMemo, useState } from "react";

import { saveProductAction, type ProductFormState } from "@/app/admin/actions";
import {
  buildSizeGuideOcrImageUrl,
  parseProductSizeGuideOcrText,
} from "@/lib/catalog/size-guide-ocr";
import {
  createDraftProductSizeGuideRows,
  DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS,
  formatProductSizeGuideColumns,
  formatProductSizeGuideRows,
  getSuggestedSizeGuideImageUrl,
  isLikelySizeGuideImageUrl,
  normalizeProductSizeGuide,
  reorderLikelySizeGuideImageUrls,
} from "@/lib/catalog/size-guides";
import { PRODUCT_STATE_HELPERS, PRODUCT_STATE_LABELS, SUPPORTED_PRODUCT_SIZES } from "@/lib/catalog/options";
import type { Brand, Category, ProductAvailability, ProductSizeGuide, ProductSizeGuideRow, ProductState } from "@/lib/catalog/types";
import { getProductImageUrlForContext } from "@/lib/media/product-images";
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
    sizeGuide?: ProductSizeGuide;
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

function compactClientValue(value: string | null | undefined) {
  return value?.trim() ?? "";
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
  const [sizeGuideOcrFeedback, setSizeGuideOcrFeedback] = useState<string | null>(null);
  const [sizeGuideOcrText, setSizeGuideOcrText] = useState("");
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [sizeGuideTitle, setSizeGuideTitle] = useState(initialProduct?.sizeGuide?.title ?? "");
  const [sizeGuideUnitLabel, setSizeGuideUnitLabel] = useState(initialProduct?.sizeGuide?.unitLabel ?? "cm");
  const [sizeGuideNotes, setSizeGuideNotes] = useState(initialProduct?.sizeGuide?.notes ?? "");
  const [sizeGuideSourceImageUrl, setSizeGuideSourceImageUrl] = useState(initialProduct?.sizeGuide?.sourceImageUrl ?? "");
  const [sizeGuideColumns, setSizeGuideColumns] = useState<string[]>(initialProduct?.sizeGuide?.columns ?? []);
  const [sizeGuideRows, setSizeGuideRows] = useState<ProductSizeGuideRow[]>(initialProduct?.sizeGuide?.rows ?? []);
  const selectedImageUrls = useMemo(() => parseClientLines(imageUrls), [imageUrls]);
  const detectedGuideImageUrl = useMemo(
    () => getSuggestedSizeGuideImageUrl(selectedImageUrls.length > 0 ? selectedImageUrls : extractedImages, { sourcePageUrl: sourceUrl }) ?? null,
    [extractedImages, selectedImageUrls, sourceUrl],
  );
  const normalizedSizeGuidePreview = useMemo(
    () =>
      normalizeProductSizeGuide({
        title: sizeGuideTitle,
        unitLabel: sizeGuideUnitLabel,
        notes: sizeGuideNotes,
        sourceImageUrl: sizeGuideSourceImageUrl || undefined,
        columns: sizeGuideColumns,
        rows: sizeGuideRows,
      }),
    [sizeGuideColumns, sizeGuideNotes, sizeGuideRows, sizeGuideSourceImageUrl, sizeGuideTitle, sizeGuideUnitLabel],
  );
  const serializedSizeGuideColumns = useMemo(
    () => formatProductSizeGuideColumns({ columns: sizeGuideColumns, rows: sizeGuideRows }),
    [sizeGuideColumns, sizeGuideRows],
  );
  const serializedSizeGuideRows = useMemo(
    () => formatProductSizeGuideRows({ columns: sizeGuideColumns, rows: sizeGuideRows }),
    [sizeGuideColumns, sizeGuideRows],
  );

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

  function handleAddSizeGuideColumn() {
    setSizeGuideColumns((currentColumns) => [...currentColumns, `Medida ${currentColumns.length + 1}`]);
    setSizeGuideRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        values: [...row.values, ""],
      })),
    );
  }

  function handleRemoveSizeGuideColumn(indexToRemove: number) {
    setSizeGuideColumns((currentColumns) => currentColumns.filter((_, index) => index !== indexToRemove));
    setSizeGuideRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        values: row.values.filter((_, index) => index !== indexToRemove),
      })),
    );
  }

  function handleChangeSizeGuideColumn(indexToUpdate: number, value: string) {
    setSizeGuideColumns((currentColumns) =>
      currentColumns.map((column, index) => (index === indexToUpdate ? value : column)),
    );
  }

  function handleAddSizeGuideRow(label = "") {
    setSizeGuideRows((currentRows) => [
      ...currentRows,
      {
        label,
        values: Array.from({ length: sizeGuideColumns.length }, () => ""),
      },
    ]);
  }

  function handleRemoveSizeGuideRow(indexToRemove: number) {
    setSizeGuideRows((currentRows) => currentRows.filter((_, index) => index !== indexToRemove));
  }

  function handleChangeSizeGuideRowLabel(indexToUpdate: number, value: string) {
    setSizeGuideRows((currentRows) =>
      currentRows.map((row, index) => (index === indexToUpdate ? { ...row, label: value } : row)),
    );
  }

  function handleChangeSizeGuideRowValue(rowIndexToUpdate: number, valueIndexToUpdate: number, value: string) {
    setSizeGuideRows((currentRows) =>
      currentRows.map((row, rowIndex) => {
        if (rowIndex !== rowIndexToUpdate) {
          return row;
        }

        return {
          ...row,
          values: row.values.map((entry, valueIndex) => (valueIndex === valueIndexToUpdate ? value : entry)),
        };
      }),
    );
  }

  function handleCreateSizeGuideDraft() {
    const nextColumns =
      sizeGuideColumns.map(compactClientValue).filter(Boolean).length > 0 ? sizeGuideColumns : [...DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS];
    const normalizedCurrentRows = sizeGuideRows.filter(
      (row) => compactClientValue(row.label) || row.values.some((value) => compactClientValue(value)),
    );
    const nextRows =
      normalizedCurrentRows.length > 0
        ? normalizedCurrentRows.map((row) => ({
            label: row.label,
            values: Array.from({ length: nextColumns.length }, (_, index) => row.values[index] ?? ""),
          }))
        : createDraftProductSizeGuideRows(sizes, nextColumns.length);

    setSizeGuideColumns(nextColumns);
    setSizeGuideRows(nextRows);

    if (!compactClientValue(sizeGuideTitle)) {
      setSizeGuideTitle("Tabla de medidas");
    }

    if (!compactClientValue(sizeGuideUnitLabel)) {
      setSizeGuideUnitLabel("cm");
    }

    if (!compactClientValue(sizeGuideSourceImageUrl) && detectedGuideImageUrl) {
      setSizeGuideSourceImageUrl(detectedGuideImageUrl);
    }
  }

  function applyParsedOcrDraft(rawText: string) {
    const parsedDraft = parseProductSizeGuideOcrText(rawText, {
      fallbackColumns: sizeGuideColumns.length > 0 ? sizeGuideColumns : DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS,
      preferredRowLabels: sizes,
    });

    setSizeGuideOcrText(parsedDraft.rawText);

    if (parsedDraft.columns.length > 0) {
      setSizeGuideColumns(parsedDraft.columns);
    }

    if (parsedDraft.rows.length > 0) {
      setSizeGuideRows(parsedDraft.rows);
    }

    if (!compactClientValue(sizeGuideTitle)) {
      setSizeGuideTitle("Tabla de medidas");
    }

    if (!compactClientValue(sizeGuideUnitLabel) && parsedDraft.unitLabel) {
      setSizeGuideUnitLabel(parsedDraft.unitLabel);
    }

    const baseMessage =
      parsedDraft.rows.length > 0
        ? `OCR listo: interpretamos ${parsedDraft.rows.length} fila(s) y ${parsedDraft.columns.length} columna(s). Revisá antes de guardar.`
        : "OCR ejecutado, pero no alcanzó para poblar la tabla sola. Te dejamos el texto crudo para corregir y reinterpretar.";

    setSizeGuideOcrFeedback([baseMessage, ...parsedDraft.warnings].join(" "));
  }

  async function handleRunSizeGuideOcr() {
    const sourceImageUrl = compactClientValue(sizeGuideSourceImageUrl) || detectedGuideImageUrl || "";

    if (!sourceImageUrl) {
      setSizeGuideOcrFeedback("Primero elegí una imagen fuente de guía de talles.");
      return;
    }

    if (!compactClientValue(sizeGuideSourceImageUrl)) {
      setSizeGuideSourceImageUrl(sourceImageUrl);
    }

    setOcrRunning(true);
    setOcrProgress(0);
    setSizeGuideOcrFeedback("Preparando OCR sobre la imagen fuente...");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (typeof message.progress === "number") {
            setOcrProgress(Math.round(message.progress * 100));
          }
        },
      });

      try {
        const result = await worker.recognize(buildSizeGuideOcrImageUrl(sourceImageUrl));
        const rawText = result.data.text.trim();

        if (!rawText) {
          setSizeGuideOcrText("");
          setSizeGuideOcrFeedback("El OCR no devolvió texto útil. Probá con otra imagen o completá la tabla manualmente.");
          return;
        }

        applyParsedOcrDraft(rawText);
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      setSizeGuideOcrFeedback(
        error instanceof Error ? `No pudimos correr el OCR: ${error.message}` : "No pudimos correr el OCR sobre la imagen fuente.",
      );
    } finally {
      setOcrRunning(false);
      setOcrProgress(null);
    }
  }

  function handleInterpretOcrText() {
    if (!compactClientValue(sizeGuideOcrText)) {
      setSizeGuideOcrFeedback("Todavía no hay texto OCR para interpretar.");
      return;
    }

    applyParsedOcrDraft(sizeGuideOcrText);
  }

  function handleSyncGuideRowsFromSizes() {
    const draftColumns = sizeGuideColumns.length > 0 ? sizeGuideColumns : [...DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS];
    const valuesByLabel = new Map(
      sizeGuideRows
        .map((row) => [compactClientValue(row.label), row.values] as const)
        .filter(([label]) => Boolean(label)),
    );

    setSizeGuideColumns(draftColumns);
    setSizeGuideRows(
      createDraftProductSizeGuideRows(sizes, draftColumns.length).map((row) => ({
        ...row,
        values: Array.from({ length: draftColumns.length }, (_, index) => valuesByLabel.get(row.label)?.[index] ?? ""),
      })),
    );
  }

  function handleClearSizeGuide() {
    setSizeGuideTitle("");
    setSizeGuideUnitLabel("cm");
    setSizeGuideNotes("");
    setSizeGuideSourceImageUrl("");
    setSizeGuideColumns([]);
    setSizeGuideRows([]);
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

    const orderedImages = reorderLikelySizeGuideImageUrls(payload.images, { sourcePageUrl: sourceUrl.trim() });

    setExtractedImages(orderedImages);
    syncSelectedImages(orderedImages);
    setExtractFeedback(`Se encontraron ${orderedImages.length} fotos canónicas. Después guardamos una maestra por foto y servimos variantes optimizadas.`);
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
              className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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

          {extractFeedback ? <p className="text-sm text-[#f4d7e0]">{extractFeedback}</p> : null}

          {detectedGuideImageUrl ? (
            <div className="rounded-[1.25rem] border border-emerald-400/20 bg-emerald-500/8 p-4 text-sm text-emerald-50">
              <p className="font-medium">Detectamos una imagen probable de guía de talles.</p>
              <p className="mt-1 break-all text-xs leading-5 text-emerald-100/78">{detectedGuideImageUrl}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-100/78">
                Queda sugerida para usar como referencia manual y el ordenamiento la manda al final del set importado.
              </p>
              <button
                type="button"
                onClick={() => setSizeGuideSourceImageUrl(detectedGuideImageUrl)}
                className="mt-3 inline-flex rounded-full border border-emerald-300/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-medium tracking-[0.18em] text-emerald-50 uppercase transition hover:border-emerald-200/50 hover:bg-emerald-500/18"
              >
                Usar como referencia
              </button>
            </div>
          ) : null}

          {extractedImages.length > 0 ? (
            <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Vista previa de Yupoo</p>
                 <p className="text-xs leading-5 text-slate-400">Agrupamos Yupoo por carpeta lógica de foto y priorizamos <span className="font-medium text-white">raw/original</span> por encima de <span className="font-medium text-white">original</span>, <span className="font-medium text-white">big</span>, <span className="font-medium text-white">medium</span>, <span className="font-medium text-white">small</span> y <span className="font-medium text-white">square</span>.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {extractedImages.map((url, index) => {
                  const isSelected = selectedImageUrls.includes(url);

                  return (
                    <label
                      key={url}
                      className={`space-y-3 rounded-[1.25rem] border p-3 transition ${
                        isSelected ? "border-[rgba(210,138,163,0.56)] bg-[rgba(210,138,163,0.12)]" : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-black/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img
                           src={getProductImageUrlForContext({ src: url }, "admin-preview")}
                           alt={`Yupoo ${index + 1}`}
                           className="h-full w-full object-cover"
                         />
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
                          {isLikelySizeGuideImageUrl(url, { index, sourcePageUrl: sourceUrl }) ? (
                            <p className="text-[11px] font-medium tracking-[0.18em] text-[#f4d7e0] uppercase">Guía probable</p>
                          ) : null}
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
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
                    checked ? "border-[rgba(210,138,163,0.56)] bg-[rgba(210,138,163,0.12)]" : "border-white/10 bg-white/[0.02]"
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
            className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
          />
          <p className="text-xs text-slate-400">Opcional. Sirve para armar el mensaje de WhatsApp con color/modelo elegido.</p>
        </div>

        <div className="space-y-4 md:col-span-2 rounded-[1.5rem] border border-white/10 bg-black/15 p-4 sm:p-5">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Guía de talles estructurada</p>
            <p className="text-xs leading-5 text-slate-400">
              Es por producto, no por variante. Si la completás, la PDP muestra una tabla prolija y oculta la imagen de medidas cuando la detectamos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="sizeGuideTitle" className="text-sm font-medium text-white">
                Título (opcional)
              </label>
              <input
                id="sizeGuideTitle"
                name="sizeGuideTitle"
                type="text"
                value={sizeGuideTitle}
                onChange={(event) => setSizeGuideTitle(event.target.value)}
                placeholder="Tabla de medidas"
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="sizeGuideUnitLabel" className="text-sm font-medium text-white">
                Unidad (opcional)
              </label>
              <input
                id="sizeGuideUnitLabel"
                name="sizeGuideUnitLabel"
                type="text"
                value={sizeGuideUnitLabel}
                onChange={(event) => setSizeGuideUnitLabel(event.target.value)}
                placeholder="cm"
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </div>

            <div className="space-y-3 md:col-span-2 rounded-[1.25rem] border border-emerald-400/15 bg-emerald-500/5 p-4">
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={handleCreateSizeGuideDraft} className={compactGhostCtaClassName}>
                  Generar borrador
                </button>
                <button
                  type="button"
                  onClick={handleSyncGuideRowsFromSizes}
                  disabled={sizes.length === 0}
                  className={`${compactGhostCtaClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Cargar filas desde talles
                </button>
                <button type="button" onClick={handleAddSizeGuideColumn} className={compactGhostCtaClassName}>
                  Agregar columna
                </button>
                <button type="button" onClick={() => handleAddSizeGuideRow()} className={compactGhostCtaClassName}>
                  Agregar fila
                </button>
                <button type="button" onClick={handleClearSizeGuide} className={compactGhostCtaClassName}>
                  Limpiar guía
                </button>
              </div>

              <div className="space-y-1 text-xs leading-5 text-slate-300">
                <p>
                  <span className="font-medium text-white">Generar borrador</span> arma la grilla con columnas comunes y usa los talles ya
                  marcados como filas.
                </p>
                <p>
                  Ahora también podés correr un OCR base sobre la imagen fuente y reinterpretar el texto si hace falta.
                </p>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="sizeGuideSourceImageUrl" className="text-sm font-medium text-white">
                Imagen fuente de referencia (opcional)
              </label>
              <input
                id="sizeGuideSourceImageUrl"
                name="sizeGuideSourceImageUrl"
                type="url"
                value={sizeGuideSourceImageUrl}
                onChange={(event) => setSizeGuideSourceImageUrl(event.target.value)}
                placeholder="https://...png"
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
              {!sizeGuideSourceImageUrl && detectedGuideImageUrl ? (
                <p className="text-xs leading-5 text-emerald-100/78">Sugerida: {detectedGuideImageUrl}</p>
              ) : null}
              <p className="text-xs leading-5 text-slate-400">
                Guardamos este dato para que el borrador OCR y futuras mejoras sepan de qué imagen salió la tabla.
              </p>

              {sizeGuideSourceImageUrl ? (
                <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-3">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-black/20 sm:max-w-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getProductImageUrlForContext({ src: sizeGuideSourceImageUrl }, "admin-preview")}
                      alt="Referencia de guía de talles"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={sizeGuideSourceImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium tracking-[0.18em] text-[#f4d7e0] uppercase underline underline-offset-4"
                    >
                      Abrir imagen fuente
                    </a>
                    {detectedGuideImageUrl && detectedGuideImageUrl !== sizeGuideSourceImageUrl ? (
                      <button
                        type="button"
                        onClick={() => setSizeGuideSourceImageUrl(detectedGuideImageUrl)}
                        className="text-xs font-medium tracking-[0.18em] text-emerald-100 uppercase underline underline-offset-4"
                      >
                        Reemplazar por sugerida
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.25rem] border border-sky-400/15 bg-sky-500/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRunSizeGuideOcr}
                    disabled={ocrRunning}
                    className={`${compactGhostCtaClassName} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {ocrRunning ? "Leyendo imagen..." : "Probar OCR desde imagen fuente"}
                  </button>
                  <button type="button" onClick={handleInterpretOcrText} className={compactGhostCtaClassName}>
                    Reinterpretar texto OCR
                  </button>
                  {ocrProgress !== null ? <p className="text-xs text-sky-100/80">Progreso OCR: {ocrProgress}%</p> : null}
                </div>

                <div className="mt-3 space-y-2">
                  <label htmlFor="sizeGuideOcrText" className="text-xs font-medium tracking-[0.16em] text-sky-100 uppercase">
                    Texto OCR crudo
                  </label>
                  <textarea
                    id="sizeGuideOcrText"
                    rows={6}
                    value={sizeGuideOcrText}
                    onChange={(event) => setSizeGuideOcrText(event.target.value)}
                    placeholder="Acá cae el texto detectado desde la imagen fuente para que lo revises o ajustes."
                    className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
                  />
                  <p className="text-xs leading-5 text-slate-300">
                    Es un borrador semi-automático: el OCR corre en el navegador, intenta detectar columnas/filas y te deja el texto editable
                    para una segunda pasada sin depender de pegar todo a mano.
                  </p>
                  {sizeGuideOcrFeedback ? <p className="text-sm text-sky-100">{sizeGuideOcrFeedback}</p> : null}
                </div>
              </div>
            </div>

            <input type="hidden" name="sizeGuideColumns" value={serializedSizeGuideColumns} />
            <input type="hidden" name="sizeGuideRows" value={serializedSizeGuideRows} />

            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-white">Editor de tabla</label>
                <p className="text-xs text-slate-400">La grilla se serializa sola al guardar.</p>
              </div>

              <div className="overflow-x-auto rounded-[1.25rem] border border-white/10">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-white/[0.04] text-left text-slate-200">
                    <tr>
                      <th className="border-b border-white/10 px-3 py-3 font-medium">Talle</th>
                      {sizeGuideColumns.map((column, index) => (
                        <th key={`column-${index}`} className="border-b border-l border-white/10 px-3 py-3 font-medium align-top">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={column}
                              onChange={(event) => handleChangeSizeGuideColumn(index, event.target.value)}
                              placeholder={`Medida ${index + 1}`}
                              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeGuideColumn(index)}
                              className="text-[11px] font-medium tracking-[0.18em] text-red-200 uppercase"
                            >
                              Quitar
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuideRows.length > 0 ? (
                      sizeGuideRows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className="align-top">
                          <td className="border-b border-white/10 px-3 py-3">
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={row.label}
                                onChange={(event) => handleChangeSizeGuideRowLabel(rowIndex, event.target.value)}
                                placeholder="S / M / L"
                                className="w-28 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveSizeGuideRow(rowIndex)}
                                className="text-[11px] font-medium tracking-[0.18em] text-red-200 uppercase"
                              >
                                Quitar
                              </button>
                            </div>
                          </td>
                          {sizeGuideColumns.map((column, valueIndex) => (
                            <td key={`row-${rowIndex}-value-${valueIndex}`} className="border-b border-l border-white/10 px-3 py-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row.values[valueIndex] ?? ""}
                                onChange={(event) => handleChangeSizeGuideRowValue(rowIndex, valueIndex, event.target.value)}
                                placeholder={column || `Valor ${valueIndex + 1}`}
                                className="w-24 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-white outline-none"
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Math.max(sizeGuideColumns.length + 1, 1)} className="px-4 py-5 text-sm text-slate-400">
                          Todavía no hay filas. Generá un borrador o agregá una fila manualmente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="sizeGuideNotes" className="text-sm font-medium text-white">
                Nota (opcional)
              </label>
              <textarea
                id="sizeGuideNotes"
                name="sizeGuideNotes"
                rows={3}
                value={sizeGuideNotes}
                onChange={(event) => setSizeGuideNotes(event.target.value)}
                placeholder="Puede variar 1-3 cm según medición manual."
                className="w-full rounded-[1.1rem] border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-5 text-slate-400">
            La guía se publica recién cuando hay <span className="font-medium text-white">al menos una columna y una fila válidas</span>. Si
            la grilla queda vacía, no aparece el botón en PDP.
          </div>

          {normalizedSizeGuidePreview ? (
            <div className="space-y-3 rounded-[1.25rem] border border-[rgba(210,138,163,0.28)] bg-[rgba(210,138,163,0.06)] p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Vista previa de la PDP</p>
                <p className="text-xs leading-5 text-slate-300">
                  Si guardás así, la PDP ya puede renderizar el botón y el modal con esta tabla.
                </p>
              </div>

              <div className="overflow-x-auto rounded-[1rem] border border-white/10">
                <table className="min-w-full border-collapse text-sm text-slate-100">
                  <thead className="bg-white/[0.05]">
                    <tr>
                      <th className="border-b border-white/10 px-3 py-2 text-left font-medium">Talle</th>
                      {normalizedSizeGuidePreview.columns.map((column) => (
                        <th key={column} className="border-b border-l border-white/10 px-3 py-2 text-left font-medium">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedSizeGuidePreview.rows.map((row, rowIndex) => (
                      <tr key={`${row.label}-${rowIndex}`}>
                        <td className="border-b border-white/10 px-3 py-2 font-medium text-white">{row.label}</td>
                        {row.values.map((value, valueIndex) => (
                          <td key={`${row.label}-${rowIndex}-${valueIndex}`} className="border-b border-l border-white/10 px-3 py-2 text-slate-300">
                            {value || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2 rounded-[1.5rem] border border-white/10 bg-black/15 p-4 text-sm leading-6 text-slate-300">
          <p className="font-medium text-white">Nuevo flujo de imágenes</p>
          <p>
            Si la fuente es Yupoo, deduplicamos variantes <span className="font-medium text-white">raw / original / big / medium / small / square</span>,
            subimos una imagen maestra por foto a Cloudinary cuando está configurado y el storefront pide versiones transformadas según contexto.
          </p>
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
