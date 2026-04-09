"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import {
  createBrand,
  createCategory,
  deleteBrand,
  deleteCategory,
  deleteProduct,
  updateBrand,
  updateCategory,
  updateProductState,
  upsertProduct,
} from "@/lib/catalog/repository";
import { SUPPORTED_PRODUCT_SIZES } from "@/lib/catalog/options";
import { normalizeProductSizeGuide, parseProductSizeGuideColumns, parseProductSizeGuideRows } from "@/lib/catalog/size-guides";
import type { ProductState } from "@/lib/catalog/types";
import { compactText, uniqueValues } from "@/lib/utils";

const sizeSchema = z.enum(SUPPORTED_PRODUCT_SIZES);

const productSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(["stock", "encargue"]),
  name: z.string().min(3, "El nombre es obligatorio."),
  brandId: z.string().min(1, "Seleccioná una marca."),
  categoryId: z.string().min(1, "Seleccioná una categoría."),
  priceArs: z.coerce.number().int().positive("El precio en ARS debe ser mayor a cero."),
  description: z.string().optional().default(""),
  availabilityNote: z.string().optional().default(""),
  state: z.enum(["draft", "published", "paused"]),
  sourceUrl: z.string().optional().default(""),
  imageUrls: z.string().optional().default(""),
  sizes: z.array(sizeSchema).optional().default([]),
  sizeGuideTitle: z.string().optional().default(""),
  sizeGuideUnitLabel: z.string().optional().default(""),
  sizeGuideNotes: z.string().optional().default(""),
  sizeGuideSourceImageUrl: z.string().optional().default(""),
  sizeGuideColumns: z.string().optional().default(""),
  sizeGuideRows: z.string().optional().default(""),
  variants: z.string().optional().default(""),
});

export interface ProductFormState {
  error?: string;
}

function parseLines(value: string) {
  return uniqueValues(
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function revalidateStorefrontPaths() {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/stock");
  revalidatePath("/encargue");
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/categories");
}

function buildSuccessMessage(message: string, warning?: string) {
  return warning ? `${message}. Ojo: ${warning}` : message;
}

export async function saveProductAction(_previousState: ProductFormState, formData: FormData) {
  await requireAdminSession();

  const parsed = productSchema.safeParse({
    productId: formData.get("productId") || undefined,
    type: formData.get("type"),
    name: formData.get("name"),
    brandId: formData.get("brandId"),
    categoryId: formData.get("categoryId"),
    priceArs: formData.get("priceArs"),
    description: formData.get("description"),
    availabilityNote: formData.get("availabilityNote"),
    state: formData.get("state"),
    sourceUrl: formData.get("sourceUrl"),
    imageUrls: formData.get("imageUrls"),
    sizes: formData.getAll("sizes"),
    sizeGuideTitle: formData.get("sizeGuideTitle"),
    sizeGuideUnitLabel: formData.get("sizeGuideUnitLabel"),
    sizeGuideNotes: formData.get("sizeGuideNotes"),
    sizeGuideSourceImageUrl: formData.get("sizeGuideSourceImageUrl"),
    sizeGuideColumns: formData.get("sizeGuideColumns"),
    sizeGuideRows: formData.get("sizeGuideRows"),
    variants: formData.get("variants"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisá los datos del producto.",
    } satisfies ProductFormState;
  }

  let successMessage: string;

  try {
    const result = await upsertProduct({
      id: parsed.data.productId,
      type: parsed.data.type,
      name: compactText(parsed.data.name),
      brandId: parsed.data.brandId,
      categoryId: parsed.data.categoryId,
      priceArs: parsed.data.priceArs,
      description: compactText(parsed.data.description),
      availabilityNote: compactText(parsed.data.availabilityNote),
      state: parsed.data.state,
      sourceUrl: compactText(parsed.data.sourceUrl) || undefined,
      imageUrls: parseLines(parsed.data.imageUrls),
      sizes: uniqueValues(parsed.data.sizes),
      sizeGuide: normalizeProductSizeGuide({
        title: compactText(parsed.data.sizeGuideTitle),
        unitLabel: compactText(parsed.data.sizeGuideUnitLabel),
        notes: compactText(parsed.data.sizeGuideNotes),
        sourceImageUrl: compactText(parsed.data.sizeGuideSourceImageUrl) || undefined,
        columns: parseProductSizeGuideColumns(parsed.data.sizeGuideColumns),
        rows: parseProductSizeGuideRows(parsed.data.sizeGuideRows),
      }),
      variants: parseLines(parsed.data.variants),
    });

    revalidateStorefrontPaths();
    successMessage = buildSuccessMessage("Producto guardado", result.warning);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo guardar el producto.",
    } satisfies ProductFormState;
  }

  redirect(`/admin/products?message=${encodeURIComponent(successMessage)}`);
}

function buildAdminRedirect(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`${path}?${searchParams.toString()}`);
}

export async function deleteProductAction(formData: FormData) {
  await requireAdminSession();

  const productId = String(formData.get("productId") ?? "");
  let redirectParams: Record<string, string>;

  try {
    await deleteProduct(productId);
    revalidateStorefrontPaths();
    redirectParams = { message: "Producto eliminado" };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo eliminar el producto.",
    };
  }

  buildAdminRedirect("/admin/products", redirectParams);
}

export async function updateProductStateAction(formData: FormData) {
  await requireAdminSession();

  const productId = String(formData.get("productId") ?? "");
  const state = String(formData.get("state") ?? "draft") as ProductState;
  let redirectParams: Record<string, string>;

  try {
    await updateProductState(productId, state);
    revalidateStorefrontPaths();
    redirectParams = { message: "Estado actualizado" };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo actualizar el estado.",
    };
  }

  buildAdminRedirect("/admin/products", redirectParams);
}

export async function createBrandAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    const result = await createBrand({
      name: compactText(String(formData.get("name") ?? "")),
      imageUrl: compactText(String(formData.get("imageUrl") ?? "")) || undefined,
      imageAlt: compactText(String(formData.get("imageAlt") ?? "")) || undefined,
    });
    revalidateStorefrontPaths();
    redirectParams = { message: buildSuccessMessage("Marca creada", result.warning) };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo crear la marca.",
    };
  }

  buildAdminRedirect("/admin/brands", redirectParams);
}

export async function updateBrandAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    const result = await updateBrand(String(formData.get("brandId") ?? ""), {
      name: compactText(String(formData.get("name") ?? "")),
      imageUrl: compactText(String(formData.get("imageUrl") ?? "")) || undefined,
      imageAlt: compactText(String(formData.get("imageAlt") ?? "")) || undefined,
    });
    revalidateStorefrontPaths();
    redirectParams = { message: buildSuccessMessage("Marca actualizada", result.warning) };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo actualizar la marca.",
    };
  }

  buildAdminRedirect("/admin/brands", redirectParams);
}

export async function deleteBrandAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    const result = await deleteBrand(String(formData.get("brandId") ?? ""));
    revalidateStorefrontPaths();
    redirectParams = { message: buildSuccessMessage("Marca eliminada", result.warning) };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo eliminar la marca.",
    };
  }

  buildAdminRedirect("/admin/brands", redirectParams);
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    const result = await createCategory({
      name: compactText(String(formData.get("name") ?? "")),
      description: compactText(String(formData.get("description") ?? "")),
      imageUrl: compactText(String(formData.get("imageUrl") ?? "")) || undefined,
      imageAlt: compactText(String(formData.get("imageAlt") ?? "")) || undefined,
    });
    revalidateStorefrontPaths();
    redirectParams = { message: buildSuccessMessage("Categoría creada", result.warning) };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo crear la categoría.",
    };
  }

  buildAdminRedirect("/admin/categories", redirectParams);
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    const result = await updateCategory(String(formData.get("categoryId") ?? ""), {
      name: compactText(String(formData.get("name") ?? "")),
      description: compactText(String(formData.get("description") ?? "")),
      imageUrl: compactText(String(formData.get("imageUrl") ?? "")) || undefined,
      imageAlt: compactText(String(formData.get("imageAlt") ?? "")) || undefined,
    });
    revalidateStorefrontPaths();
    redirectParams = { message: buildSuccessMessage("Categoría actualizada", result.warning) };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo actualizar la categoría.",
    };
  }

  buildAdminRedirect("/admin/categories", redirectParams);
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdminSession();
  let redirectParams: Record<string, string>;

  try {
    await deleteCategory(String(formData.get("categoryId") ?? ""));
    revalidateStorefrontPaths();
    redirectParams = { message: "Categoría eliminada" };
  } catch (error) {
    redirectParams = {
      error: error instanceof Error ? error.message : "No se pudo eliminar la categoría.",
    };
  }

  buildAdminRedirect("/admin/categories", redirectParams);
}
