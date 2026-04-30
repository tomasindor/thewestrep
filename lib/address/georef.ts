/**
 * Georef API client — Argentine geographic data from datos.gob.ar
 * Docs: https://apis.datos.gob.ar/georef
 *
 * Province/City dropdowns use this API to populate hierarchical selects.
 * Data is cached at the Next.js edge layer for performance.
 */
import "server-only";

export interface Provincia {
  id: string;
  nombre: string;
}

export interface Departamento {
  id: string;
  nombre: string;
}

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api";

/**
 * Fetch all provinces (cached for 24h).
 * Returns array of { id, nombre } for all 24 Argentine provinces.
 */
export async function fetchProvincias(): Promise<Provincia[]> {
  const res = await fetch(`${GEOREF_BASE}/provincias.json`, {
    next: { revalidate: 86_400 }, // 24 hours
  });

  if (!res.ok) {
    throw new Error(`Georef provinces fetch failed: ${res.status}`);
  }

  const data = await res.json() as { provincias: Provincia[] };
  return data.provincias;
}

/**
 * Fetch departamentos (cities/towns) for a given province ID (cached per province).
 * Use this when the user selects a province to populate the city dropdown.
 *
 * @param provinciaId - The province ID (e.g., "02" for CABA, "06" for Buenos Aires)
 */
export async function fetchDepartamentos(provinciaId: string): Promise<Departamento[]> {
  const res = await fetch(
    `${GEOREF_BASE}/departamentos.json?provincia=${provinciaId}&max=500`,
    { next: { revalidate: 86_400 } },
  );

  if (!res.ok) {
    throw new Error(`Georef departamentos fetch failed: ${res.status}`);
  }

  const data = await res.json() as { departamentos: Departamento[] };
  return data.departamentos;
}

/**
 * Build a pre-filled WhatsApp URL for payment coordination.
 * Message includes the order reference and amount for quick identification.
 */
export function buildWhatsappPaymentUrl(params: {
  reference: string;
  totalAmountArs: number;
  phone?: string;
}): string {
  const message = `Hola, tengo un pedido pendiente en TheWestRep: ${params.reference}. Total: $${params.totalAmountArs.toLocaleString("es-AR")}. ¿Cómo coordinamos el pago?`;
  const base = params.phone ? `https://wa.me/${params.phone.replace(/\D/g, "")}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}