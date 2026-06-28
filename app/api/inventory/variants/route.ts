import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createVariantSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createVariantSchema.parse(body);
    const variant = await prisma.productVariant.create({ data });
    return Response.json(variant, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
