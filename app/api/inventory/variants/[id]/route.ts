import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";
import { updateVariantSchema } from "@/lib/validations/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = updateVariantSchema.parse(body);
    const variant = await prisma.productVariant.update({ where: { id }, data });
    return Response.json(variant);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const [orderCount, procurementCount] = await Promise.all([
      prisma.salesOrderItem.count({ where: { variantId: id } }),
      prisma.procurementItem.count({ where: { variantId: id } }),
    ]);

    if (orderCount > 0 || procurementCount > 0) {
      await prisma.productVariant.update({
        where: { id },
        data: { isActive: false },
      });
      return Response.json({
        success: true,
        phasedOut: true,
        message: `Variant deactivated (${orderCount} sale(s), ${procurementCount} procurement(s) on record). Historical data preserved.`,
      });
    }

    await prisma.productVariant.delete({ where: { id } });
    return Response.json({ success: true, phasedOut: false });
  } catch (error) {
    return handleApiError(error);
  }
}
