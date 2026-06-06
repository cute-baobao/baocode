export type Role = "USER" | "ASSISTANT" | "ERROR";
export type Mode = "BUILD" | "PLAN";
export type MessageStatus = "COMPLETED" | "INTERRUPTED";

export enum ROLE {
    USER = "USER",
    ASSISTANT = "ASSISTANT",
    ERROR = "ERROR",
}

export enum MODE {
    BUILD = "BUILD",
    PLAN = "PLAN",
}

export enum MESSAGE_STATUS {
    COMPLETED = "COMPLETED",
    INTERRUPTED = "INTERRUPTED",
}