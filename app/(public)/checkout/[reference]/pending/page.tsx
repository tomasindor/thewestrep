import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PaymentButtons } from "@/components/checkout/payment-buttons";
import { getOrderByReference } from "@/lib/orders/repository";
import { buildWhatsappPaymentUrl } from "@/lib/address/georef";
import { surfaceClassName } from "@/lib/ui";

interface PendingPageProps {
  params: Promise<{ reference: string }>;
}

export async function generateMetadata({ params }: PendingPageProps): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Pedido pendiente | TheWestRep`,
    description: `Pedido ${reference} pendiente de pago en TheWestRep.`,
  };
}

export default async function CheckoutPendingPage({ params }: PendingPageProps) {
  const { reference } = await params;
  const order = await getOrderByReference(reference);

  if (!order) {
    notFound();
  }

  if (order.status === "paid") {
    redirect(`/checkout/${reference}/confirmed`);
  }

  const formattedTotal = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(order.totalAmountArs);

  const whatsappUrl = buildWhatsappPaymentUrl({
    reference: order.reference,
    totalAmountArs: order.totalAmountArs,
  });

  return (
    <main className="flex-1 py-10 sm:py-14">
      <div className="mx-auto max-w-xl px-6">
        <div className={surfaceClassName}>
          <h1 className="text-lg font-semibold text-white">Pedido pendiente</h1>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Referencia</span>
              <span className="font-mono text-sm text-white">{order.reference}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Total</span>
              <span className="text-sm font-medium text-white">{formattedTotal}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Estado</span>
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                Pendiente de pago
              </span>
            </div>
          </div>

          <PaymentButtons
            orderId={order.id}
            reference={order.reference}
            totalAmountArs={order.totalAmountArs}
            whatsappUrl={whatsappUrl}
          />
        </div>
      </div>
    </main>
  );
}
