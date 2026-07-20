import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/auth-helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    await prisma.salesTarget.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
