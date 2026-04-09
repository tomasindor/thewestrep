import type { CartCustomerProfile, CartItem } from "@/lib/cart/types";

function normalizeValue(value: string) {
  return value.trim();
}

function buildCartItemDetail(item: CartItem) {
  const selections = [item.variantLabel?.trim(), item.sizeLabel?.trim()].filter(Boolean);
  const selectionSuffix = selections.length > 0 ? ` · ${selections.join(" · ")}` : "";

  return `- ${item.quantity}x ${item.productName} (${item.availabilityLabel})${selectionSuffix} · ${item.priceDisplay}`;
}

function getPreferredChannelLabel(channel: CartCustomerProfile["preferredChannel"]) {
  if (channel === "whatsapp") {
    return "WhatsApp";
  }

  if (channel === "instagram") {
    return "Instagram";
  }

  if (channel === "email") {
    return "Mail";
  }

  return "";
}

function getCustomerStatusLabel(status: CartCustomerProfile["customerStatus"]) {
  if (status === "new") {
    return "Primera compra";
  }

  if (status === "returning") {
    return "Ya compró antes";
  }

  return "";
}

function getFulfillmentLabel(fulfillment: CartCustomerProfile["fulfillment"]) {
  if (fulfillment === "envio-caba-gba") {
    return "Envío CABA/GBA";
  }

  if (fulfillment === "envio-interior") {
    return "Envío interior";
  }

  return "";
}

export function buildCartWhatsappMessage(items: CartItem[], customer: CartCustomerProfile) {
  const normalizedName = normalizeValue(customer.name);
  const normalizedPhone = normalizeValue(customer.phone);
  const normalizedEmail = normalizeValue(customer.email);
  const normalizedPreferredChannel = getPreferredChannelLabel(customer.preferredChannel);
  const normalizedCustomerStatus = getCustomerStatusLabel(customer.customerStatus);
  const normalizedFulfillment = getFulfillmentLabel(customer.fulfillment);
  const normalizedLocation = normalizeValue(customer.location);
  const normalizedNotes = normalizeValue(customer.notes);

  const lines = [
    "Hola, quiero avanzar con este carrito de thewestrep:",
    "",
    ...items.map(buildCartItemDetail),
    "",
    `Nombre: ${normalizedName}`,
    `Teléfono: ${normalizedPhone}`,
    `Email: ${normalizedEmail}`,
    ...(normalizedPreferredChannel ? [`Canal preferido: ${normalizedPreferredChannel}`] : []),
    ...(normalizedCustomerStatus ? [`Tipo de cliente: ${normalizedCustomerStatus}`] : []),
    ...(normalizedFulfillment ? [`Entrega: ${normalizedFulfillment}`] : []),
    ...(normalizedLocation ? [`Zona o entrega: ${normalizedLocation}`] : []),
    ...(normalizedNotes ? [`Notas: ${normalizedNotes}`] : []),
  ];

  return lines.join("\n");
}
