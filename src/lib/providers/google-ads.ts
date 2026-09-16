import type { AdsProvider, CampaignDraft, KeywordIdeaRequest } from "../types";
import { normalizeCustomerId, parseKeyword } from "../domain";

type KeywordIdeaApiRow = {
  text?: string;
  keywordIdeaMetrics?: {
    avgMonthlySearches?: string | number;
    competition?: string;
    competitionIndex?: string | number;
    lowTopOfPageBidMicros?: string | number;
    highTopOfPageBidMicros?: string | number;
  };
};
type MutateApiResponse = { campaignResult?: { resourceName?: string } };

const version = process.env.GOOGLE_ADS_API_VERSION || "v22";
const base = `https://googleads.googleapis.com/${version}`;

export function buildGoogleAdsHeaders(
  token: string,
  config = {
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  },
): Record<string, string> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  if (config.developerToken) headers["developer-token"] = config.developerToken;
  if (config.loginCustomerId) {
    headers["login-customer-id"] = normalizeCustomerId(
      config.loginCustomerId,
    );
  }
  return headers;
}

export function buildKeywordIdeaBody(input: KeywordIdeaRequest) {
  const seed = input.url
    ? { keywordAndUrlSeed: { keywords: input.seeds, url: input.url } }
    : { keywordSeed: { keywords: input.seeds } };
  return {
    language: `languageConstants/${input.languageId}`,
    geoTargetConstants: input.locationIds.map(
      (id) => `geoTargetConstants/${id}`,
    ),
    keywordPlanNetwork: "GOOGLE_SEARCH_AND_PARTNERS",
    includeAdultKeywords: false,
    ...seed,
  };
}

export function buildPausedCampaignOperations(
  input: CampaignDraft,
): Array<Record<string, unknown>> {
  const customerId = normalizeCustomerId(input.customerId);
  const budgetName = `customers/${customerId}/campaignBudgets/-1`;
  const campaignName = `customers/${customerId}/campaigns/-2`;
  const operations: Array<Record<string, unknown>> = [
    {
      campaignBudgetOperation: {
        create: {
          resourceName: budgetName,
          name: `${input.campaignName} Budget ${Date.now()}`,
          amountMicros: String(input.dailyBudgetMicros),
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    },
    {
      campaignOperation: {
        create: {
          resourceName: campaignName,
          name: input.campaignName,
          status: "PAUSED",
          advertisingChannelType: "SEARCH",
          campaignBudget: budgetName,
          manualCpc: { enhancedCpcEnabled: false },
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
        },
      },
    },
    ...input.locationIds.map((id) => ({
      campaignCriterionOperation: {
        create: {
          campaign: campaignName,
          location: { geoTargetConstant: `geoTargetConstants/${id}` },
        },
      },
    })),
    {
      campaignCriterionOperation: {
        create: {
          campaign: campaignName,
          language: {
            languageConstant: `languageConstants/${input.languageId}`,
          },
        },
      },
    },
  ];

  input.groups.forEach((group, groupIndex) => {
    const adGroupName = `customers/${customerId}/adGroups/${-100 - groupIndex}`;
    operations.push({
      adGroupOperation: {
        create: {
          resourceName: adGroupName,
          name: group.name,
          campaign: campaignName,
          status: "ENABLED",
          type: "SEARCH_STANDARD",
        },
      },
    });
    group.keywords.forEach((keyword) =>
      operations.push({
        adGroupCriterionOperation: {
          create: {
            adGroup: adGroupName,
            status: "ENABLED",
            keyword: { text: keyword.text, matchType: keyword.matchType },
          },
        },
      }),
    );
    group.negativeKeywords.forEach((text) =>
      operations.push({
        adGroupCriterionOperation: {
          create: {
            adGroup: adGroupName,
            negative: true,
            keyword: { text, matchType: "PHRASE" },
          },
        },
      }),
    );
    operations.push({
      adGroupAdOperation: {
        create: {
          adGroup: adGroupName,
          status: "ENABLED",
          ad: {
            finalUrls: [input.finalUrl],
            responsiveSearchAd: {
              headlines: group.creative.headlines.map((text) => ({ text })),
              descriptions: group.creative.descriptions.map((text) => ({
                text,
              })),
            },
          },
        },
      },
    });
  });
  const sitelinks = Array.from(
    new Map(
      input.groups
        .flatMap((group) => group.creative.sitelinks)
        .map((item) => [item.text.toLowerCase(), item]),
    ).values(),
  ).slice(0, 4);
  sitelinks.forEach((sitelink, index) => {
    const assetName = `customers/${customerId}/assets/${-500 - index}`;
    operations.push({
      assetOperation: {
        create: {
          resourceName: assetName,
          finalUrls: [sitelink.finalUrl],
          sitelinkAsset: {
            linkText: sitelink.text,
            description1: sitelink.description1,
            description2: sitelink.description2,
          },
        },
      },
    });
    operations.push({
      campaignAssetOperation: {
        create: {
          campaign: campaignName,
          asset: assetName,
          fieldType: "SITELINK",
        },
      },
    });
  });
  return operations;
}

async function accessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken)
    throw new Error("Google OAuth environment variables are incomplete");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Google OAuth token refresh failed");
  return ((await response.json()) as { access_token: string }).access_token;
}

async function googleFetch(path: string, init: RequestInit = {}) {
  const token = await accessToken();
  const headers = buildGoogleAdsHeaders(token);
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!response.ok) {
    const message = await response.text();
    console.error("Google Ads API error", response.status, message);
    throw new Error(`Google Ads API request failed (${response.status})`);
  }
  return response.json();
}

export const googleAdsProvider: AdsProvider = {
  async listAccounts() {
    const accessible = (await googleFetch(
      "/customers:listAccessibleCustomers",
    )) as { resourceNames?: string[] };
    const ids = (accessible.resourceNames || [])
      .map((name) => name.split("/").pop()!)
      .filter(Boolean);
    const accounts = await Promise.all(
      ids.map(async (id) => {
        try {
          const rows = (await googleFetch(
            `/customers/${id}/googleAds:searchStream`,
            {
              method: "POST",
              body: JSON.stringify({
                query:
                  "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1",
              }),
            },
          )) as Array<{
            results?: Array<{ customer?: Record<string, string> }>;
          }>;
          const customer = rows[0]?.results?.[0]?.customer || {};
          return {
            id,
            name: customer.descriptiveName || `Google Ads ${id}`,
            currencyCode: customer.currencyCode || "USD",
            timeZone: customer.timeZone || "UTC",
          };
        } catch {
          return {
            id,
            name: `Google Ads ${id}`,
            currencyCode: "USD",
            timeZone: "UTC",
          };
        }
      }),
    );
    return accounts;
  },
  async keywordIdeas(input) {
    const customerId = normalizeCustomerId(input.customerId);
    const data = (await googleFetch(
      `/customers/${customerId}:generateKeywordIdeas`,
      { method: "POST", body: JSON.stringify(buildKeywordIdeaBody(input)) },
    )) as { results?: KeywordIdeaApiRow[] };
    return (data.results || []).map((row) =>
      parseKeyword({
        text: row.text || "",
        monthlySearches: Number(
          row.keywordIdeaMetrics?.avgMonthlySearches || 0,
        ),
        competition: row.keywordIdeaMetrics?.competition || "UNSPECIFIED",
        competitionIndex: Number(row.keywordIdeaMetrics?.competitionIndex || 0),
        lowTopPageBidMicros: Number(
          row.keywordIdeaMetrics?.lowTopOfPageBidMicros || 0,
        ),
        highTopPageBidMicros: Number(
          row.keywordIdeaMetrics?.highTopOfPageBidMicros || 0,
        ),
        relevance: 75,
        intent: "commercial",
        selected: true,
        negative: false,
      }),
    );
  },
  async createPausedCampaign(input) {
    const customerId = normalizeCustomerId(input.customerId);
    const data = (await googleFetch(
      `/customers/${customerId}/googleAds:mutate`,
      {
        method: "POST",
        body: JSON.stringify({
          mutateOperations: buildPausedCampaignOperations(input),
          partialFailure: false,
          validateOnly: false,
        }),
      },
    )) as { mutateOperationResponses?: MutateApiResponse[] };
    const campaign = data.mutateOperationResponses?.find(
      (item) => item.campaignResult,
    )?.campaignResult?.resourceName;
    return {
      resourceName: campaign || `customers/${customerId}/campaigns/created`,
      status: "PAUSED",
    };
  },
};
