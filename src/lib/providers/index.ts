import { isDemo } from "../env";
import { demoAdsProvider, demoAiProvider } from "./demo";
import { googleAdsProvider } from "./google-ads";
import { openAiProvider } from "./openai";

export const adsProvider = () =>
  isDemo() ? demoAdsProvider : googleAdsProvider;
export const aiProvider = () => (isDemo() ? demoAiProvider : openAiProvider);
