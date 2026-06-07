import { findSupportedChatModel, SUPPORTED_CHAT_MODELS, type SupportedChatModel, type SupportedChatModelId } from "@baocode/shared";
import { deepseek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";

type DeepseekModelId = Extract<SupportedChatModel,{provider:"Deepseek"}>["id"];

export type ResolvedModel = {
    model: LanguageModel;
    provider: "deepseek";
    modelId: DeepseekModelId;
}

function assertUnsupportedProvider(provider: string): never {
    throw new Error(`Unsupported provider: ${provider}`);
}


function resolveDeepseekModel(modelId: DeepseekModelId): ResolvedModel {
    return {
        model: deepseek(modelId),
        provider: "deepseek",
        modelId,
    }
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

export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
    return findSupportedChatModel(modelId) !== null;
}

export function resolveChatModel(modelId: string): ResolvedModel {
    const model = findSupportedChatModel(modelId);
    if (!model) {
        throw new Error(`Unsupported model: ${modelId}`);
    }
    return resolveSupportedChatModel(model);
}