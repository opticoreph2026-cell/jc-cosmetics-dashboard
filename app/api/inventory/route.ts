import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createProductSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const products = await prisma.product.findMany({
      include: { category: true, variants: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(products);
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
