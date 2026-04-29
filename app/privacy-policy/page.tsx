import type { Metadata } from "next";

import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Política de privacidad",
  description: "Cómo TheWestRep procesa y protege tus datos personales para compras y autenticación.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 text-slate-200 sm:px-8 sm:py-16">
      <h1 className="text-3xl font-semibold text-white">Política de privacidad</h1>
      <p>
        Al crear una cuenta en TheWestRep, autorizás el tratamiento de tus datos para gestionar tu identidad,
        pedidos y comunicaciones relacionadas a la compra.
      </p>
      <p>
        Conservamos email, nombre y datos de contacto necesarios para operar el checkout. Podés solicitar
        actualización o eliminación de tus datos escribiendo a nuestro canal de soporte.
      </p>
      <p>
        Esta versión de política aplica desde la fecha de publicación y puede actualizarse para reflejar cambios
        regulatorios o de operación.
      </p>
    </main>
  );
}
