import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const includeActuals = searchParams.get("actuals") !== "false";

    const targets = await prisma.salesTarget.findMany({
      where: { year, month },
      orderBy: { channel: "asc" },
    });

    if (!includeActuals) {
      return NextResponse.json(targets);
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const actuals = await prisma.salesOrder.groupBy({
      by: ["channel"],
      where: { createdAt: { gte: startDate, lte: endDate } },
      _sum: { total: true },
      _count: { id: true },
    });

    const actualMap = new Map(actuals.map((a) => [a.channel, { total: Number(a._sum.total || 0), orders: a._count.id }]));

    const allChannels = ["WEB", "FACEBOOK_POST", "FACEBOOK_MARKETPLACE", "PHYSICAL"] as const;
    const result = allChannels.map((ch) => {
      const target = targets.find((t) => t.channel === ch);
      const actual = actualMap.get(ch);
      const actualTotal = actual?.total ?? 0;
      const targetTotal = target ? Number(target.target) : 0;
      return {
        channel: ch,
        target: targetTotal,
        actual: actualTotal,
        orders: actual?.orders ?? 0,
        achievement: targetTotal > 0 ? Math.round((actualTotal / targetTotal) * 100) : null,
      };
    });

    const totals = result.reduce(
      (acc, r) => ({
        target: acc.target + r.target,
        actual: acc.actual + r.actual,
        orders: acc.orders + r.orders,
      }),
      { target: 0, actual: 0, orders: 0 }
    );

    return NextResponse.json({ channels: result, totals, year, month });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { month, year, channel, target } = body;

    if (!month || !year || !channel || target == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const upserted = await prisma.salesTarget.upsert({
      where: { month_year_channel: { month, year, channel } },
      create: { month, year, channel, target },
      update: { target },
    });

    return NextResponse.json(upserted, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
