import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { updateSupplierSchema } from "@/lib/validations/schemas";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const data = updateSupplierSchema.parse(body);
    const supplier = await prisma.supplier.update({ where: { id }, data });
    return Response.json(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await prisma.$transaction(async (tx) => {
      await tx.supplierProduct.deleteMany({ where: { supplierId: id } });
      await tx.procurement.deleteMany({ where: { supplierId: id } });
      await tx.supplier.delete({ where: { id } });
    });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
