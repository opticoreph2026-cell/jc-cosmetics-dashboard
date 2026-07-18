import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CONFIG_KEYS = ["monthlyRent", "monthlySalaries", "monthlyUtilities", "monthlyMarketing", "monthlyOther"] as const;

export async function GET() {
  try {
    const rows = await prisma.businessConfig.findMany({
      where: { key: { in: CONFIG_KEYS as unknown as string[] } },
    });
    const config: Record<string, string> = {};
    for (const key of CONFIG_KEYS) {
      config[key] = rows.find((r) => r.key === key)?.value ?? "0";
    }
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const entries = Object.entries(body).filter(([key]) => (CONFIG_KEYS as unknown as string[]).includes(key));

    for (const [key, value] of entries) {
      await prisma.businessConfig.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
