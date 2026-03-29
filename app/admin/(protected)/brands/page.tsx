import { createBrandAction, deleteBrandAction, updateBrandAction } from "@/app/admin/actions";
import { getBrandsRepository } from "@/lib/catalog";
import { compactGhostCtaClassName, compactSolidCtaClassName } from "@/lib/ui";

interface AdminBrandsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

export default async function AdminBrandsPage({ searchParams }: AdminBrandsPageProps) {
  const params = await searchParams;
  const brands = await getBrandsRepository();
  const message = getSearchValue(params.message);
  const error = getSearchValue(params.error);

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-orange-200/70 uppercase">Marcas</p>
        <h1 className="font-display text-5xl text-white">CRUD de marcas</h1>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}

      <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-semibold text-white">Crear marca</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Si Cloudinary está configurado, la imagen remota se gestiona ahí con cleanup real. En desarrollo local, sin credenciales, se guarda
          localmente como fallback. Solo se aceptan URLs HTTPS o paths internos de <code>/public</code>.
        </p>
        <form action={createBrandAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="name" placeholder="Nombre de marca" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <input name="imageUrl" placeholder="URL de imagen" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <input name="imageAlt" placeholder="Alt de imagen" className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
          <button type="submit" className={`${compactSolidCtaClassName} w-fit`}>Crear</button>
        </form>
      </section>

      <div className="space-y-3">
        {brands.map((brand) => (
          <article key={brand.id} className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
            <form action={updateBrandAction} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="brandId" value={brand.id} />
              <input name="name" defaultValue={brand.name} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              <input
                name="imageUrl"
                defaultValue={brand.imageSourceUrl ?? brand.image ?? ""}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none"
              />
              <input name="imageAlt" defaultValue={brand.alt ?? ""} className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none" />
              <button type="submit" className={`${compactGhostCtaClassName} w-fit`}>Guardar</button>
            </form>
            <form action={deleteBrandAction} className="mt-3">
              <input type="hidden" name="brandId" value={brand.id} />
              <button type="submit" className={compactGhostCtaClassName}>Eliminar</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
