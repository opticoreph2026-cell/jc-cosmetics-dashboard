import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";
import { updateProductSchema, createVariantSchema, updateVariantSchema } from "@/lib/validations/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, variants: true },
    });
    if (!product) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = updateProductSchema.parse(body);

    const product = await prisma.product.update({ where: { id }, data });
    return Response.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true, variants: { select: { id: true } } },
    });
    if (!product) throw new ApiError("Not found", 404);

    const variantIds = product.variants.map((v) => v.id);

    if (variantIds.length > 0) {
      const [orderCount, ledgerCount, supplierCount, procurementCount] = await Promise.all([
        prisma.salesOrderItem.count({ where: { variantId: { in: variantIds } } }),
        prisma.inventoryLedger.count({ where: { variantId: { in: variantIds } } }),
        prisma.supplierProduct.count({ where: { variantId: { in: variantIds } } }),
        prisma.procurementItem.count({ where: { variantId: { in: variantIds } } }),
      ]);

      const reasons: string[] = [];
      if (orderCount > 0) reasons.push(`${orderCount} sales order item(s)`);
      if (ledgerCount > 0) reasons.push(`${ledgerCount} ledger entry(ies)`);
      if (supplierCount > 0) reasons.push(`${supplierCount} supplier link(s)`);
      if (procurementCount > 0) reasons.push(`${procurementCount} procurement item(s)`);

      if (reasons.length > 0) {
        throw new ApiError(
          `Cannot delete "${product.name}": ${reasons.join(", ")}. Remove these first.`,
          400
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
