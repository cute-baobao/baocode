import {
  findSupportedChatModel,
  SUPPORTED_CHAT_MODELS,
  type SupportedChatModel,
  type SupportedChatModelId,
} from "@baocode/shared";
import { deepseek, type DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

type DeepseekModelId = Extract<
  SupportedChatModel,
  { provider: "Deepseek" }
>["id"];

export type ResolvedModel = {
  model: LanguageModel;
  provider: "deepseek";
  modelId: DeepseekModelId;
  providerOptions?: ProviderOptions;
};

const DEEPSEEK_PROVIDER_OPTIONS: Partial<
  Record<DeepseekModelId, ProviderOptions>
> = {
  "deepseek-v4-flash": {
    deepseek: {
      thinking: { type: "enabled" },
      reasoningEffort: "high",
    } satisfies DeepSeekLanguageModelOptions,
  },
  "deepseek-v4-pro": {
    deepseek: {
      thinking: { type: "enabled" },
      reasoningEffort: "high",
    } satisfies DeepSeekLanguageModelOptions,
  },
};

function assertUnsupportedProvider(provider: string): never {
  throw new Error(`Unsupported provider: ${provider}`);
}

function resolveDeepseekModel(modelId: DeepseekModelId): ResolvedModel {
  return {
    model: deepseek(modelId),
    provider: "deepseek",
    modelId,
    providerOptions: DEEPSEEK_PROVIDER_OPTIONS[modelId],
  };
}

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;
  switch (provider) {
    case "Deepseek":
      return resolveDeepseekModel(model.id);
    default:
      assertUnsupportedProvider(model.provider);
  }
}

export function isSupportedChatModel(
  modelId: string,
): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) !== null;
}

export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }
  return resolveSupportedChatModel(model);
}
