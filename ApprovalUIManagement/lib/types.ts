export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";
export type Breakpoint = "mobile" | "tablet" | "desktop";

export interface ApprovalRequest {
    requestId: string;
    campaign: string;
    requestType?: string;
    requestedStartDate?: Date;
    requestedEndDate?: Date;
    submittedBy?: string;
    approver?: string;
    status: string;
}

export interface ApprovalItem {
    itemId: string;
    requestId: string;
    itemName: string;
    itemType?: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    placementId?: string;
}

export interface HistoryEntry {
    historyId: string;
    requestId: string;
    actionLabel: string;
    actor: string;
    timestamp: Date;
    comment?: string;
}

export interface CommentEntry {
    commentId: string;
    requestId: string;
    author: string;
    timestamp: Date;
    text: string;
}

/** Where an action may be taken. "both" is the default for config rows that do not say. */
export type ActionScope = "request" | "item" | "both";

/**
 * One configurable action. Same shape the 1.6 control read from ApprovalConfigJson;
 * `scope` is new and optional.
 */
export interface ApprovalAction {
    key: string;
    label: string;
    resultStatus: string;
    requiresComment: boolean;
    requiresDateChange: boolean;
    requiresConfirmation: boolean;
    active: boolean;
    order: number;
    scope?: ActionScope;
}

/** Payload on ApprovalActionPayloadJson — unchanged from 1.6. */
export interface RequestActionPayload {
    action: string;
    requestId: string[];
    comment?: string;
}

/** Payload on ItemActionPayloadJson — unchanged from 1.6. */
export interface ItemActionPayload {
    action: string;
    itemId: string[];
    comment?: string;
    revisedStartDate?: string;
    revisedEndDate?: string;
}

/**
 * ItemAvailabilityJson, parsed. Same input as 1.6:
 *   { availableFrom?, availableTo?, blockedDates? | fullDates?, placementName?, dailyCapacity? }
 * plus the v2-only `freeDates` (shown as "Nearest free" chips).
 */
export interface ItemAvailability {
    /** set when the JSON is not an object, or the window keys are present but invalid */
    bad: boolean;
    window: { availableFrom: string; availableTo: string } | null;
    blocked: string[];
    freeDates: string[];
    placementName: string;
    dailyCapacity: number | null;
}

export interface DatasetState<T> {
    rows: T[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
}

export interface ControlConfig {
    title: string;
    subtitle: string;
    approvalConfigJson: string;
    showSearch: boolean;
    showFilter: boolean;
    showSummaryCards: boolean;
    emptyStateTitle: string;
    emptyStateSubtitle: string;
    /** 1.6: hides the whole-request decision bar when false */
    allowRequestActions: boolean;
    /** 1.6: hides every item action when false */
    allowItemActions: boolean;
    /** v2: optional type filter on top of allowRequestActions; empty = every type */
    requestLevelTypes: string[];
}
