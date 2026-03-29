import type { ProductAvailability } from "@/lib/catalog/types";

interface BuildProductWhatsappMessageInput {
  productName: string;
  availability: ProductAvailability;
  variantLabel?: string | null;
  sizeLabel?: string | null;
}

function normalizeSelection(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function buildProductWhatsappCta(availability: ProductAvailability) {
  return availability === "stock" ? "Reservar por WhatsApp" : "Cotizar por WhatsApp";
}

export function buildProductWhatsappMessage({
  productName,
  availability,
  variantLabel,
  sizeLabel,
}: BuildProductWhatsappMessageInput) {
  const selections = [normalizeSelection(variantLabel), normalizeSelection(sizeLabel)].filter(Boolean);
  const detail = selections.length > 0 ? ` (${selections.join(" · ")})` : "";

  return availability === "stock"
    ? `Hola, quiero reservar ${productName}${detail} y coordinar entrega con thewestrep.`
    : `Hola, quiero cotizar ${productName}${detail} por encargue con thewestrep.`;
}
