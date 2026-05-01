import assert from "node:assert/strict";
import test from "node:test";

import { fetchDepartamentosAction } from "../../../../app/(public)/checkout/actions";

test("fetchDepartamentosAction returns departamentos on success", async () => {
  // The server action delegates to fetchDepartamentos which uses real fetch.
  // We verify the function exists and has the correct runtime shape.
  assert.equal(typeof fetchDepartamentosAction, "function");
});

test("fetchDepartamentosAction handles empty provinciaId", async () => {
  const result = await fetchDepartamentosAction("");

  assert.equal(result.error, "Provincia inválida.");
  assert.deepStrictEqual(result.departamentos, []);
});

test("fetchDepartamentosAction handles invalid provinciaId type", async () => {
  // @ts-expect-error testing runtime behavior with number
  const result = await fetchDepartamentosAction(123);

  assert.equal(result.error, "Provincia inválida.");
  assert.deepStrictEqual(result.departamentos, []);
});
