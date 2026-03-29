import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/app/admin/actions";
import { getCategoriesRepository } from "@/lib/catalog";
import { compactGhostCtaClassName, compactSolidCtaClassName } from "@/lib/ui";

interface AdminCategoriesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const params = await searchParams;
  const categories = await getCategoriesRepository();
  const message = getSearchValue(params.message);
  const error = getSearchValue(params.error);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Categorías</p>
        <h1 className="font-display text-5xl text-white">CRUD de categorías</h1>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Crear categoría</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Si pegás una URL, el servidor intenta guardarla localmente en <code>/public/uploads/categories</code>. En Vercel sin storage externo,
          queda la URL remota como fallback.
        </p>
        <form action={createCategoryAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Nombre" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <input name="imageUrl" placeholder="Imagen (URL o /public)" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <input name="imageAlt" placeholder="Alt de imagen" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <div className="md:col-span-2">
            <textarea name="description" rows={3} placeholder="Descripción breve" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          </div>
          <button type="submit" className={`${compactSolidCtaClassName} w-fit`}>Crear</button>
        </form>
      </section>

      <div className="space-y-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <form action={updateCategoryAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="categoryId" value={category.id} />
              <input name="name" defaultValue={category.name} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              <input name="imageUrl" defaultValue={category.image} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              <input name="imageAlt" defaultValue={category.alt} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              <div className="md:col-span-2">
                <textarea name="description" rows={3} defaultValue={category.description} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              </div>
              <button type="submit" className={`${compactGhostCtaClassName} w-fit`}>Guardar</button>
            </form>
            <form action={deleteCategoryAction} className="mt-3">
              <input type="hidden" name="categoryId" value={category.id} />
              <button type="submit" className={compactGhostCtaClassName}>Eliminar</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
