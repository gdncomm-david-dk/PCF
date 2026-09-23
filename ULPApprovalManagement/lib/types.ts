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
 * One configurable action. Same shape the 1.x control read from ApprovalConfigJson;
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

/** Payload on ApprovalActionPayloadJson — unchanged from 1.x. */
export interface RequestActionPayload {
    action: string;
    requestId: string[];
    comment?: string;
}

/** Payload on ItemActionPayloadJson — unchanged from 1.x. */
export interface ItemActionPayload {
    action: string;
    itemId: string[];
    comment?: string;
    revisedStartDate?: string;
    revisedEndDate?: string;
}

/** ItemAvailabilityJson: `{ availableFrom, availableTo }` (yyyy-mm-dd), optional `freeDates`. */
export interface ItemAvailability {
    availableFrom: string;
    availableTo: string;
    freeDates?: string[];
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
    requestLevelTypes: string[];
}
