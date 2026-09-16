import { apiError, requireUser } from "@/lib/auth";
import { filterKeywords, researchSchema } from "@/lib/domain";
import { adsProvider, aiProvider } from "@/lib/providers";
import { withFallbackTimeout } from "@/lib/research";
import { createResearchProject } from "@/lib/storage";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const input = researchSchema.parse(await request.json());
    const ideas = await adsProvider().keywordIdeas({
      customerId: input.customerId,
      seeds: input.seeds,
      url: input.url,
      locationIds: input.locationIds,
      languageId: input.languageId,
    });
    const scored = await withFallbackTimeout(
      aiProvider().scoreKeywords({
        keywords: ideas.slice(0, 60),
        description: input.description,
      }),
      5_000,
      ideas.slice(0, 60),
    );
    const projectId = await createResearchProject(user, input, scored);
    return Response.json({
      projectId,
      keywords: scored,
      recommended: filterKeywords(scored, input.minimumVolume),
      websiteContextFound: false,
    });
  } catch (error) {
    return apiError(error);
  }
}
