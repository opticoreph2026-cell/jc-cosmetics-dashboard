import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAuth();
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
