import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase environment variables are incomplete");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const db = database();
    const { data, error } = await db
      .from("deployments")
      .select("id, customer_id, request_snapshot, status, created_at")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !data || !data.length) {
      return Response.json({ pending: false, message: "No campaigns found" });
    }

    const item = data[0];
    const draft = item.request_snapshot as {
      campaignName: string;
      dailyBudgetMicros: number;
      finalUrl: string;
      groups: Array<{
        name: string;
        keywords: Array<{ text: string; matchType: string }>;
        negativeKeywords: string[];
        creative: {
          headlines: string[];
          descriptions: string[];
          sitelinks: Array<{
            text: string;
            description1: string;
            description2: string;
            finalUrl: string;
          }>;
        };
      }>;
    };

    const group = draft.groups?.[0] || {
      name: `${draft.campaignName} Group`,
      keywords: [],
      negativeKeywords: [],
      creative: { headlines: [], descriptions: [], sitelinks: [] },
    };

    return Response.json({
      pending: true,
      id: item.id,
      status: item.status,
      customerId: item.customer_id,
      campaignName: draft.campaignName,
      dailyBudget: (draft.dailyBudgetMicros || 50_000_000) / 1_000_000,
      finalUrl: draft.finalUrl,
      adGroupName: group.name,
      keywords: (group.keywords || []).map((k) => k.text),
      negativeKeywords: group.negativeKeywords || [],
      headlines: group.creative?.headlines || [],
      descriptions: group.creative?.descriptions || [],
      sitelinks: group.creative?.sitelinks || [],
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Sync error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.id) {
      const db = database();
      await db
        .from("deployments")
        .update({
          status: "DEPLOYED",
          response_snapshot: { deployedVia: "Google Ads Script Bridge", at: new Date().toISOString() },
        })
        .eq("id", body.id);
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Update error" },
      { status: 500 }
    );
  }
}
