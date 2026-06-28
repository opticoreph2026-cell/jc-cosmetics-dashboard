import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { createSupplierSchema } from "@/lib/validations/schemas";

export async function GET() {
  try {
    await requireAuth();
    const suppliers = await prisma.supplier.findMany({
      include: { supplierProducts: { include: { variant: { include: { product: { select: { name: true } } } } } } },
      orderBy: { name: "asc" },
    });
    return Response.json(suppliers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createSupplierSchema.parse(body);
    const supplier = await prisma.supplier.create({ data });
    return Response.json(supplier, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
