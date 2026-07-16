import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, json } from "@/lib/auth-helpers";
import { createProductSchema } from "@/lib/validations/schemas";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const includeVariants = searchParams.get("variants") === "true";

    if (includeVariants) {
      const products = await prisma.product.findMany({
        select: { id: true, name: true, variants: { select: { id: true, name: true, sku: true, unitCost: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      const serialized = products.map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, unitCost: Number(v.unitCost) })) }));
      return json(serialized);
    }

    const products = await prisma.product.findMany({
      select: { id: true, name: true, category: { select: { name: true } }, variants: { select: { currentStockQty: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const serialized = products.map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, currentStockQty: Number(v.currentStockQty) })) }));
    return json(serialized);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createProductSchema.parse(body);

    const product = await prisma.product.create({ data });
    return Response.json(product, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
