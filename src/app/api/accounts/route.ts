import { apiError, requireUser } from "@/lib/auth";
import { adsProvider } from "@/lib/providers";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireUser(request);
    return Response.json({ accounts: await adsProvider().listAccounts() });
  } catch (error) {
    return apiError(error);
  }
}
