import { createClient } from "@supabase/supabase-js";
import { isDemo } from "./env";
import type { AuthUser } from "./auth";
import type { CampaignDraft, Creative, KeywordIdea } from "./types";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase server environment variables are incomplete");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createResearchProject(
  user: AuthUser,
  input: Record<string, unknown>,
  keywords: KeywordIdea[],
): Promise<string> {
  if (isDemo()) return "demo-project";
  const { data, error } = await database()
    .from("projects")
    .insert({
      name: String(input.company || "Campaign draft"),
      customer_id: input.customerId,
      company: input.company,
      description: input.description,
      final_url: input.url,
      location_ids: input.locationIds,
      language_id: input.languageId,
      minimum_volume: input.minimumVolume,
      brief: input,
      keywords,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error("Could not save the research project");
  return data.id;
}

export async function saveCreative(
  user: AuthUser,
  projectId: string | undefined,
  creative: Creative,
): Promise<void> {
  if (isDemo() || !projectId) return;
  const { error } = await database()
    .from("projects")
    .update({
      creative,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);
  if (error) throw new Error("Could not save the creative draft");
}

export async function saveDeployment(
  user: AuthUser,
  projectId: string | undefined,
  campaign: CampaignDraft,
  response: unknown,
): Promise<void> {
  if (isDemo()) return;
  const db = database();
  const { error } = await db
    .from("deployments")
    .insert({
      project_id: projectId || null,
      customer_id: campaign.customerId,
      campaign_resource_name: (response as { resourceName?: string })
        .resourceName,
      status: "PAUSED",
      request_snapshot: campaign,
      response_snapshot: response,
      created_by: user.id,
    });
  if (error)
    throw new Error(
      "Campaign was created but its deployment log could not be saved",
    );
  if (projectId)
    await db
      .from("projects")
      .update({
        status: "deployed",
        campaign_draft: campaign,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
}
