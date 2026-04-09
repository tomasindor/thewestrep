import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerProfileShippingSummary,
  deriveCustomerNameParts,
  deriveStreetAddressParts,
  normalizeCustomerFullName,
  normalizeStreetAddressLine,
} from "../../lib/auth/customer-profile-fields";

test("splits legacy full names into first and last name", () => {
  assert.deepEqual(deriveCustomerNameParts("Gonzalo Pérez"), {
    firstName: "Gonzalo",
    lastName: "Pérez",
  });
  assert.deepEqual(deriveCustomerNameParts(" Madonna "), {
    firstName: "Madonna",
    lastName: "",
  });
});

test("splits legacy address lines into street and number when possible", () => {
  assert.deepEqual(deriveStreetAddressParts("Nicaragua 5400"), {
    street: "Nicaragua",
    streetNumber: "5400",
  });
  assert.deepEqual(deriveStreetAddressParts("Ruta Provincial 2 km 84"), {
    street: "Ruta Provincial 2 km",
    streetNumber: "84",
  });
});

test("normalizes customer profile shipping summaries with the new street model", () => {
  assert.equal(normalizeCustomerFullName("Gonzalo", "Pérez"), "Gonzalo Pérez");
  assert.equal(normalizeStreetAddressLine("Nicaragua", "5400"), "Nicaragua 5400");
  assert.equal(
    buildCustomerProfileShippingSummary({
      shippingStreet: "Nicaragua",
      shippingStreetNumber: "5400",
      shippingAddressLine2: "Piso 4 B",
      shippingCity: "CABA",
      shippingProvince: "Buenos Aires",
      shippingPostalCode: "C1414",
    }),
    "Nicaragua 5400 · Piso 4 B · CABA, Buenos Aires · C1414",
  );
});
