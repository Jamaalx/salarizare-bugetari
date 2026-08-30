import { NextResponse } from "next/server";
import { VARIANTA_IDS, esteVariantaId } from "@/lib/variants";
import { getCoeficienti } from "@/lib/variants-data";

// Setul de coeficienți al unei variante a proiectului, în formatul citit de
// Wizard/Calculator ({ varianta, data: CoefEntry[] }). Prerandat la build
// pentru cele trei variante cunoscute; cache 1 zi + SWR 7 zile.
export const dynamic = "force-static";

export function generateStaticParams() {
  return VARIANTA_IDS.map((varianta) => ({ varianta }));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ varianta: string }> },
) {
  const { varianta } = await ctx.params;
  if (!esteVariantaId(varianta)) {
    return NextResponse.json(
      { error: "VARIANTA_NECUNOSCUTA", variante: VARIANTA_IDS },
      { status: 404 },
    );
  }
  return NextResponse.json(
    { varianta, data: getCoeficienti(varianta) },
    {
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
