export type Role = "user" | "assistant" | "error";
export type Mode = "BUILD" | "PLAN";
export type MessageStatus = "COMPLETED" | "INTERRUPTED";

export enum ROLE {
    USER = "user",
    ASSISTANT = "assistant",
    ERROR = "error",
}

export enum MODE {
    BUILD = "BUILD",
    PLAN = "PLAN",
}

export enum MESSAGE_STATUS {
    COMPLETED = "COMPLETED",
    INTERRUPTED = "INTERRUPTED",
}