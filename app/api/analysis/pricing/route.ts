import { requireAuth, handleApiError } from "@/lib/auth-helpers";
import { computeAnalysis } from "@/lib/analysis";

export async function GET() {
  try {
    await requireAuth();
    const data = await computeAnalysis();
    return Response.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
