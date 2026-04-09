import { ProductForm } from "@/components/admin/product-form";
import { getBrandsRepository, getCategoriesRepository } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([getBrandsRepository(), getCategoriesRepository()]);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Nuevo producto</p>
        <h1 className="font-display text-5xl text-white">Alta rápida para V1</h1>
      </div>
      <ProductForm brands={brands} categories={categories} />
    </section>
  );
}
