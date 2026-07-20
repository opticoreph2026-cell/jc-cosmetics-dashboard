import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { variant: { include: { product: { select: { name: true } } } } },
        },
      },
    });
    if (!order) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { discount, notes, paymentMethod, amountTendered, changeGiven } = body;

    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      select: { subtotal: true, discount: true, total: true, customerId: true },
    });
    if (!existing) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (discount !== undefined || notes !== undefined || paymentMethod !== undefined || amountTendered !== undefined || changeGiven !== undefined) {
      if (discount !== undefined) {
        const newDiscount = Number(discount);
        const newTotal = Number(existing.subtotal) - newDiscount;
        updateData.discount = newDiscount;
        updateData.total = newTotal < 0 ? 0 : newTotal;
      }
      if (notes !== undefined) updateData.notes = notes;
      if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
      if (amountTendered !== undefined) updateData.amountTendered = Number(amountTendered);
      if (changeGiven !== undefined) updateData.changeGiven = Number(changeGiven);
    } else {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: updateData,
        include: {
          customer: { select: { id: true, name: true } },
          items: {
            include: { variant: { include: { product: { select: { name: true } } } } },
          },
        },
      });

      if (existing.customerId && discount !== undefined) {
        const discountDiff = Number(updateData.discount) - Number(existing.discount);
        if (discountDiff !== 0) {
          await tx.customer.update({
            where: { id: existing.customerId },
            data: { totalLifetimeSpend: { decrement: discountDiff } },
          });
        }
      }

      return updatedOrder;
    });

    return Response.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id },
        include: { items: true, customer: true },
      });
      if (!order) throw new Error("Order not found");

      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { currentStockQty: { increment: item.qty } },
          });
        }

        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeQty: item.qty,
            channel: order.channel,
            referenceId: order.id,
            referenceType: "VOID",
            note: `Order ${order.orderNumber} voided`,
            previousStockQty: variant?.currentStockQty ?? 0,
            newStockQty: (variant?.currentStockQty ?? 0) + item.qty,
          },
        });
      }

      if (order.customer) {
        await tx.customer.update({
          where: { id: order.customer.id },
          data: { totalLifetimeSpend: { decrement: Number(order.total) } },
        });
      }

      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: order.id } });
      await tx.salesOrder.delete({ where: { id } });
    });

    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
