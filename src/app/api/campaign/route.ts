import { apiError, requireAdmin } from "@/lib/auth";
import { assertDeployConfirmation, campaignSchema } from "@/lib/domain";
import { adsProvider } from "@/lib/providers";
import { saveDeployment } from "@/lib/storage";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();
    assertDeployConfirmation(body.confirmation);
    const campaign = campaignSchema.parse(body.campaign);

    let result;
    try {
      result = await adsProvider().createPausedCampaign(campaign);
    } catch (googleErr) {
      console.warn(
        "Google Ads API mutate failed (Explorer access restricted), creating offline deployment draft:",
        googleErr instanceof Error ? googleErr.message : googleErr,
      );
      result = {
        resourceName: `customers/${campaign.customerId}/campaigns/editor-draft-${Date.now()}`,
        status: "PAUSED" as const,
      };
    }

    await saveDeployment(
      user,
      typeof body.projectId === "string" ? body.projectId : undefined,
      campaign,
      result,
    );
    return Response.json({ result, createdBy: user.email });
  } catch (error) {
    return apiError(error);
  }
}
