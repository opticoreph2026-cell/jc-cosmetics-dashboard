import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";
import { createSupplierProductSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createSupplierProductSchema.parse(body);

    const variant = await prisma.productVariant.findUnique({ where: { id: data.variantId } });
    if (!variant) throw new ApiError("Variant not found", 404);

    const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
    if (!supplier) throw new ApiError("Supplier not found", 404);

    const existing = await prisma.supplierProduct.findUnique({
      where: { supplierId_variantId: { supplierId: data.supplierId, variantId: data.variantId } },
    });
    if (existing) throw new ApiError("This variant is already linked to this supplier", 409);

    const link = await prisma.supplierProduct.create({ data });
    return Response.json(link, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
