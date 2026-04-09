export interface CustomerNameParts {
  firstName: string;
  lastName: string;
}

export interface CustomerStreetAddressParts {
  street: string;
  streetNumber: string;
}

export function normalizeCustomerFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
}

export function deriveCustomerNameParts(name: string): CustomerNameParts {
  const normalizedName = name.trim().replace(/\s+/g, " ");

  if (!normalizedName) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = normalizedName.split(" ");

  return {
    firstName,
    lastName: rest.join(" "),
  };
}

export function normalizeStreetAddressLine(street: string, streetNumber: string) {
  return [street.trim(), streetNumber.trim()].filter(Boolean).join(" ").trim();
}

export function deriveStreetAddressParts(addressLine1: string): CustomerStreetAddressParts {
  const normalizedLine = addressLine1.trim().replace(/\s+/g, " ");

  if (!normalizedLine) {
    return { street: "", streetNumber: "" };
  }

  const matchedAddress = normalizedLine.match(/^(.*\D)\s+(\d[\dA-Za-z\-\/]*)$/);

  if (!matchedAddress) {
    return { street: normalizedLine, streetNumber: "" };
  }

  return {
    street: matchedAddress[1]?.trim() ?? normalizedLine,
    streetNumber: matchedAddress[2]?.trim() ?? "",
  };
}

export function buildCustomerProfileShippingSummary(profile: {
  shippingStreet?: string;
  shippingStreetNumber?: string;
  shippingAddressLine1?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingProvince?: string;
  shippingPostalCode?: string;
}) {
  const primaryLine =
    normalizeStreetAddressLine(profile.shippingStreet ?? "", profile.shippingStreetNumber ?? "") ||
    profile.shippingAddressLine1?.trim() ||
    "";

  return [
    primaryLine,
    profile.shippingAddressLine2 ?? "",
    [profile.shippingCity?.trim() ?? "", profile.shippingProvince?.trim() ?? ""].filter(Boolean).join(", "),
    profile.shippingPostalCode ?? "",
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" · ");
}
