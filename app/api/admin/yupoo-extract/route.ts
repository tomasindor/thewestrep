import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { extractYupooImages } from "@/lib/yupoo";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAdminSession();

  try {
    const body = (await request.json()) as { url?: string };

    if (!body.url) {
      return NextResponse.json({ error: "Falta la URL de Yupoo." }, { status: 400 });
    }

    const result = await extractYupooImages(body.url);

    return NextResponse.json(result);
  } catch (error) {
    logger.error("yupoo_extract_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo extraer imágenes desde Yupoo.",
      },
      { status: 500 },
    );
  }
}
