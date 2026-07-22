import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { quickLogSchema } from "@/lib/validations/schemas";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = quickLogSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      let customerId: string | undefined;

      if (data.phone) {
        const identity = await tx.customerChannelIdentity.findFirst({ where: { phone: data.phone } });
        if (identity) {
          customerId = identity.customerId;
        } else {
          const customer = await tx.customer.create({
            data: {
              name: `Customer ${data.phone.slice(-4)}`,
              phone: data.phone,
              channelIdentities: {
                create: {
                  channel: data.channel,
                  channelCustomerId: `${data.channel}-${data.phone}`,
                  phone: data.phone,
                },
              },
            },
          });
          customerId = customer.id;
        }
      }

      let total = 0;
      let totalCost = 0;
      const orderItems: any[] = [];

      for (const item of data.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        if (variant.currentStockQty < item.qty) {
          throw new Error("Insufficient stock");
        }

        const unitPriceAtSale = Number(variant.sellingPrice);
        const unitCostAtSale = Number(variant.unitCost);
        const subtotal = unitPriceAtSale * item.qty;
        total += subtotal;
        totalCost += unitCostAtSale * item.qty;

        orderItems.push({
          variantId: item.variantId,
          qty: item.qty,
          unitPriceAtSale,
          unitCostAtSale,
          subtotal,
          previousStockQty: variant.currentStockQty,
        });
      }

      const lastSO = await tx.salesOrder.findFirst({ orderBy: { orderNumber: "desc" }, select: { orderNumber: true } });
      const nextNum = lastSO ? parseInt(lastSO.orderNumber.replace("SO-", ""), 10) + 1 : 1;

      const order = await tx.salesOrder.create({
        data: {
          orderNumber: `SO-${String(nextNum).padStart(4, "0")}`,
          channel: data.channel,
          paymentMethod: data.paymentMethod,
          customerId,
          subtotal: total,
          discount: 0,
          total,
          createdAt: data.saleDate ? new Date(data.saleDate) : undefined,
          items: { create: orderItems.map(({ previousStockQty, ...oi }) => oi) },
        },
      });

      for (const item of orderItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { currentStockQty: { decrement: item.qty } },
        });

        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeQty: -item.qty,
            channel: data.channel,
            referenceId: order.id,
            referenceType: "SALES_ORDER",
            previousStockQty: item.previousStockQty,
            newStockQty: item.previousStockQty - item.qty,
            createdAt: data.saleDate ? new Date(data.saleDate) : undefined,
          },
        });
      }

      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { totalLifetimeSpend: { increment: total } },
        });
      }

      return order;
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
