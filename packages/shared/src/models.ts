export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

export type SupportedProvider = "Deepseek";

type SupportedChaModelDefinition = {
  id: string;
  provider: SupportedProvider;
  pricing: ModelPricing;
};

export const SUPPORTED_CHAT_MODELS = [
  {
    id: "deepseek-v4-flash",
    provider: "Deepseek",
    pricing: {
      inputUsdPerMillionTokens: 0.14,
      outputUsdPerMillionTokens: 0.28,
    },
  },
  {
    id: "deepseek-v4-pro",
    provider: "Deepseek",
    pricing: {
      inputUsdPerMillionTokens: 0.435,
      outputUsdPerMillionTokens: 0.87,
    },
  },
] as const satisfies ReadonlyArray<SupportedChaModelDefinition>;

export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];

export type SupportedChatModelId = SupportedChatModel["id"];

export function findSupportedChatModel(
  id: string,
): SupportedChatModel | undefined {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === id);
}

export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "deepseek-v4-flash";
