import { NextRequest } from "next/server";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { predictReorder, analyzeAllProducts, evaluateNewProduct, generatePromo, type ReorderPrediction, type ProductInsight, type FeasibilityResult, type PromoCopy } from "@/lib/product-intelligence";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "all";

    if (mode === "reorder") {
      const data = await predictReorder();
      return Response.json({ mode: "reorder", data });
    }
    if (mode === "insights") {
      const data = await analyzeAllProducts();
      return Response.json({ mode: "insights", data });
    }
    if (mode === "promo") {
      const variantId = searchParams.get("variantId") || undefined;
      const data = await generatePromo(variantId);
      return Response.json({ mode: "promo", data });
    }
    if (mode === "feasibility") {
      return Response.json({ mode: "feasibility", data: null });
    }

    const [reorder, insights, promos] = await Promise.all([
      predictReorder(),
      analyzeAllProducts(),
      generatePromo(),
    ]);

    return Response.json({
      mode: "all",
      data: { reorder, insights, promos },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { action } = body;

    if (action === "feasibility") {
      const result = await evaluateNewProduct(body);
      return Response.json({ mode: "feasibility", data: result });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
