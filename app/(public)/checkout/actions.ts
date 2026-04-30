"use server";

import { fetchDepartamentos } from "@/lib/address/georef";

export async function fetchDepartamentosAction(provinciaId: string) {
  if (!provinciaId || typeof provinciaId !== "string") {
    return { error: "Provincia inválida.", departamentos: [] };
  }

  try {
    const departamentos = await fetchDepartamentos(provinciaId);
    return { departamentos };
  } catch {
    return { error: "No pudimos cargar las ciudades ahora.", departamentos: [] };
  }
}
