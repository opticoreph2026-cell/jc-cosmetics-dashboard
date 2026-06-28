import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "@/lib/prisma/client/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const { variantId, qty, channel, paymentMethod, phone } = await req.json();

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) return Response.json({ error: "Variant not found" }, { status: 404 });
    if (variant.currentStockQty < qty) {
      return Response.json({ error: "Insufficient stock" }, { status: 400 });
    }

    let customerId: string | undefined;

    if (phone) {
      const identity = await prisma.customerChannelIdentity.findFirst({ where: { phone } });
      if (identity) {
        customerId = identity.customerId;
      } else {
        const customer = await prisma.customer.create({
          data: {
            name: `Customer ${phone.slice(-4)}`,
            phone,
            channelIdentities: {
              create: {
                channel: channel as any,
                channelCustomerId: `${channel}-${phone}`,
                phone,
              },
            },
          },
        });
        customerId = customer.id;
      }
    }

    const previousStockQty = variant.currentStockQty;
    const newStockQty = previousStockQty - qty;
    const unitPriceAtSale = Number(variant.sellingPrice);
    const unitCostAtSale = Number(variant.unitCost);
    const subtotal = unitPriceAtSale * qty;

    const result = await prisma.$transaction(async (tx) => {
      const orderCount = await tx.salesOrder.count();
      const order = await tx.salesOrder.create({
        data: {
          orderNumber: `SO-${String(orderCount + 1).padStart(4, "0")}`,
          channel: channel as any,
          paymentMethod: paymentMethod as any,
          customerId,
          subtotal,
          discount: 0,
          total: subtotal,
          items: {
            create: {
              variantId,
              qty,
              unitPriceAtSale,
              unitCostAtSale,
              subtotal,
            },
          },
        },
      });

      await tx.inventoryLedger.create({
        data: {
          variantId,
          changeQty: -qty,
          channel: channel as any,
          referenceId: order.id,
          referenceType: "SALES_ORDER",
          previousStockQty,
          newStockQty,
        },
      });

      await tx.productVariant.update({
        where: { id: variantId },
        data: { currentStockQty: newStockQty },
      });

      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          await tx.customer.update({
            where: { id: customerId },
            data: { totalLifetimeSpend: Number(customer.totalLifetimeSpend) + subtotal },
          });
        }
      }

      return order;
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
