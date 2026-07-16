import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError, ApiError } from "@/lib/auth-helpers";
import { updateLedgerSchema } from "@/lib/validations/schemas";

function getId(req: NextRequest, paramsId: string | undefined): string {
  if (paramsId) return paramsId;
  const url = new URL(req.url);
  const segs = url.pathname.split("/");
  return segs[segs.length - 1];
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id: paramsId } = await params;
    const id = getId(req, paramsId);

    if (!id) throw new ApiError("Missing ledger entry ID", 400);

    const body = await req.json();
    const data = updateLedgerSchema.parse(body);

    const entry = await prisma.inventoryLedger.findUnique({ where: { id } });
    if (!entry) throw new ApiError(`Ledger entry not found: ${id}`, 404);

    const updated = await prisma.inventoryLedger.update({
      where: { id },
      data: {
        ...(data.note !== undefined && { note: data.note }),
        ...(data.channel !== undefined && { channel: data.channel }),
      },
    });

    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id: paramsId } = await params;
    const id = getId(_req, paramsId);

    if (!id) throw new ApiError("Missing ledger entry ID", 400);

    const entry = await prisma.inventoryLedger.findUnique({
      where: { id },
      include: { variant: { select: { id: true, currentStockQty: true } } },
    });
    if (!entry) throw new ApiError(`Ledger entry not found: ${id}`, 404);

    await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: entry.variantId },
        data: { currentStockQty: { decrement: entry.changeQty } },
      });
      await tx.inventoryLedger.delete({ where: { id } });
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
