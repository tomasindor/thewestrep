import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getAdminProductById, getBrandsRepository, getCategoriesRepository } from "@/lib/catalog";

interface EditProductPageProps {
  params: Promise<{ productId: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  const [brands, categories, product] = await Promise.all([
    getBrandsRepository(),
    getCategoriesRepository(),
    getAdminProductById(productId),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Editar producto</p>
        <h1 className="font-display text-5xl text-white">{product.name}</h1>
      </div>
      <ProductForm brands={brands} categories={categories} initialProduct={product} />
    </section>
  );
}
