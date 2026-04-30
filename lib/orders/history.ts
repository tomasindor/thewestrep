export type OrderHistoryStatus = "pending_payment" | "paid";

export interface OrderHistoryItemSnapshot {
  id: string;
  productName: string;
  quantity: number;
  availabilityLabel: string;
  variantLabel: string | null;
  sizeLabel: string | null;
}

export interface OrderHistoryEntrySnapshot {
  id: string;
  reference: string;
  createdAtIso: string;
  status: OrderHistoryStatus;
  totalAmountArs: number;
  currencyCode: string;
  lineItemCount: number;
  unitCount: number;
  containsEncargueItems: boolean;
  items: OrderHistoryItemSnapshot[];
}

export function formatOrderHistoryStatus(status: OrderHistoryStatus) {
  if (status === "pending_payment") {
    return "Pendiente de pago";
  }

  if (status === "paid") {
    return "Pagado";
  }

  return status;
}

export function formatOrderHistoryDate(createdAtIso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAtIso));
}

export function formatOrderHistoryItemLabel(item: Pick<OrderHistoryItemSnapshot, "productName" | "variantLabel" | "sizeLabel">) {
  const selection = [item.variantLabel, item.sizeLabel].filter(Boolean).join(" · ");

  return selection ? `${item.productName} · ${selection}` : item.productName;
}
