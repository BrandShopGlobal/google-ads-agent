import { apiError, requireUser } from "@/lib/auth";
import { filterKeywords, researchSchema } from "@/lib/domain";
import { adsProvider, aiProvider } from "@/lib/providers";
import { websiteContext } from "@/lib/security";
import { createResearchProject } from "@/lib/storage";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = researchSchema.parse(await request.json());
    const context = await websiteContext(input.url).catch(() => "");
    const expanded = await aiProvider().expandKeywords({
      seeds: input.seeds,
      company: input.company,
      description: input.description,
      websiteContext: context,
    });
    const ideas = await adsProvider().keywordIdeas({
      customerId: input.customerId,
      seeds: expanded.slice(0, 100),
      url: input.url,
      locationIds: input.locationIds,
      languageId: input.languageId,
    });
    const scored = await aiProvider().scoreKeywords({
      keywords: ideas,
      description: input.description,
    });
    const projectId = await createResearchProject(user, input, scored);
    return Response.json({
      projectId,
      keywords: scored,
      recommended: filterKeywords(scored, input.minimumVolume),
      websiteContextFound: Boolean(context),
    });
  } catch (error) {
    return apiError(error);
  }
}
