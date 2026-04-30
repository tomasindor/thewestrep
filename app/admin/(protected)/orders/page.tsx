import Link from "next/link";

import { requireAdminSession } from "@/lib/auth/session";
import { createAdminOrdersRouteHandlers } from "@/lib/orders/admin-route-handlers";
import { OrderTabs } from "@/components/admin/order-tabs";

export const dynamic = "force-dynamic";

interface AdminOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  await requireAdminSession();
  const params = await searchParams;
  const tab = getSingleParam(params.tab) ?? "all";

  const handlers = createAdminOrdersRouteHandlers();

  const [allRes, pendingRes, paidRes] = await Promise.all([
    handlers.listOrders(new Request("http://localhost/api/admin/orders?limit=0")),
    handlers.listOrders(new Request("http://localhost/api/admin/orders?status=pending_payment&limit=0")),
    handlers.listOrders(new Request("http://localhost/api/admin/orders?status=paid&limit=0")),
  ]);

  const [allBody, pendingBody, paidBody] = await Promise.all([
    allRes.json(),
    pendingRes.json(),
    paidRes.json(),
  ]);

  const counts = {
    all: allBody.ok ? allBody.data.pagination.total : 0,
    pending: pendingBody.ok ? pendingBody.data.pagination.total : 0,
    paid: paidBody.ok ? paidBody.data.pagination.total : 0,
  };

  const statusParam = tab === "pending" ? "pending_payment" : tab === "paid" ? "paid" : null;
  const listUrl = statusParam
    ? `http://localhost/api/admin/orders?status=${statusParam}&limit=50`
    : "http://localhost/api/admin/orders?limit=50";
  const listRes = await handlers.listOrders(new Request(listUrl));
  const listBody = await listRes.json();

  if (!listBody.ok) {
    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Pedidos</p>
          <h1 className="font-display text-5xl text-white">Órdenes V2</h1>
        </div>
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {listBody.error ?? "No se pudieron cargar los pedidos."}
        </p>
      </section>
    );
  }

  const items = listBody.data.items as Array<{
    reference: string;
    customerName: string;
    total: number;
    status: string;
  }>;

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.32em] text-[#f1d2dc]/70 uppercase">Pedidos</p>
        <h1 className="font-display text-5xl text-white">Órdenes V2</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-300">
          Vista simplificada de pedidos con los dos estados de V2: pendiente de pago y pagado.
        </p>
      </div>

      <OrderTabs counts={counts} activeTab={tab} />

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead className="bg-black/25 text-slate-300">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((order) => (
                <tr key={order.reference}>
                  <td className="px-4 py-4 align-top">
                    <Link
                      href={`/admin/orders/${order.reference}`}
                      className="text-white transition hover:text-[#f4d7e0]"
                    >
                      {order.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-300">{order.customerName}</td>
                  <td className="px-4 py-4 align-top text-slate-300">
                    ${order.total.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {order.status === "pending_payment" ? (
                      <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                        Pendiente de pago
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                        Pagado
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-300">
                    No hay pedidos en esta categoría.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
