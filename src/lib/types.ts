export type UserRole = "admin" | "member";

export type AdsAccount = {
  id: string;
  name: string;
  currencyCode: string;
  timeZone: string;
};

export type KeywordIdea = {
  text: string;
  monthlySearches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  competitionIndex: number;
  lowTopPageBidMicros: number;
  highTopPageBidMicros: number;
  relevance: number;
  intent: "commercial" | "informational" | "job" | "competitor" | "irrelevant";
  selected: boolean;
  negative: boolean;
};

export type Creative = {
  headlines: string[];
  descriptions: string[];
  sitelinks: Array<{
    text: string;
    description1: string;
    description2: string;
    finalUrl: string;
  }>;
};

export type AdGroupDraft = {
  name: string;
  keywords: Array<{ text: string; matchType: "EXACT" | "PHRASE" }>;
  negativeKeywords: string[];
  creative: Creative;
};

export type CampaignDraft = {
  customerId: string;
  campaignName: string;
  dailyBudgetMicros: number;
  locationIds: string[];
  languageId: string;
  finalUrl: string;
  groups: AdGroupDraft[];
};

export type KeywordIdeaRequest = {
  customerId: string;
  seeds: string[];
  url?: string;
  locationIds: string[];
  languageId: string;
};

export interface AdsProvider {
  listAccounts(): Promise<AdsAccount[]>;
  keywordIdeas(input: KeywordIdeaRequest): Promise<KeywordIdea[]>;
  createPausedCampaign(
    input: CampaignDraft,
  ): Promise<{ resourceName: string; status: "PAUSED" }>;
}

export interface AiProvider {
  expandKeywords(input: {
    seeds: string[];
    company: string;
    description: string;
    websiteContext: string;
  }): Promise<string[]>;
  scoreKeywords(input: {
    keywords: KeywordIdea[];
    description: string;
  }): Promise<KeywordIdea[]>;
  generateCreative(input: {
    company: string;
    description: string;
    finalUrl: string;
    keywords: string[];
  }): Promise<Creative>;
}
