export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function compactText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function formatArs(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function defaultProductImage(productName: string) {
  return {
    src: "/destacada.png",
    alt: productName ? `Imagen de referencia de ${productName}` : "Imagen de referencia de thewestrep",
  };
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}
