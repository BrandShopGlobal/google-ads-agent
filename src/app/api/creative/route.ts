import { apiError, requireUser } from "@/lib/auth";
import { creativeRequestSchema } from "@/lib/domain";
import { aiProvider } from "@/lib/providers";
import { saveCreative } from "@/lib/storage";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await request.json();
    const input = creativeRequestSchema.parse(body);
    const creative = await aiProvider().generateCreative(input);
    await saveCreative(
      user,
      typeof body.projectId === "string" ? body.projectId : undefined,
      creative,
    );
    return Response.json({ creative });
  } catch (error) {
    return apiError(error);
  }
}
