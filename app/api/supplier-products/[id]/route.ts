import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const link = await prisma.supplierProduct.findUnique({ where: { id } });
    if (!link) throw new ApiError("Link not found", 404);

    await prisma.supplierProduct.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
