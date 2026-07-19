import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { computeAnalysis } from "@/lib/analysis";

export async function GET() {
  try {
    await requireAuth();
    const data = await computeAnalysis();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
