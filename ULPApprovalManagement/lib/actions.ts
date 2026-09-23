import { ActionScope, ApprovalAction, Tone } from "./types";

export const PENDING_STATUS = "Pending";

/**
 * Default action set. Keys are the ones the ApprovalScreen Power Fx handler switches on:
 *   request block A: APPROVE, CONFIRM, REJECT, REVISION
 *   item block B:    APPROVE, CONFIRM, REJECT, APPROVE_CHANGE
 * Scope keeps each button on the level where the handler writes every list it should:
 *   REVISION at item level writes nothing (varItemNew is blank) -> request only.
 *   CONFIRM at request level sets the header but cascades nothing -> item only.
 */
export const DEFAULT_ACTIONS: ApprovalAction[] = [
    { key: "APPROVE", label: "Approve", resultStatus: "Approved", requiresComment: false, requiresDateChange: false, requiresConfirmation: true, active: true, order: 1, scope: "both" },
    { key: "CONFIRM", label: "Confirm", resultStatus: "Confirmed", requiresComment: false, requiresDateChange: false, requiresConfirmation: true, active: false, order: 2, scope: "item" },
    { key: "REJECT", label: "Reject", resultStatus: "Rejected", requiresComment: true, requiresDateChange: false, requiresConfirmation: true, active: true, order: 3, scope: "both" },
    { key: "APPROVE_CHANGE", label: "Approve with changes", resultStatus: "Approved with Changes", requiresComment: true, requiresDateChange: true, requiresConfirmation: true, active: true, order: 4, scope: "item" },
    { key: "REVISION", label: "Request revision", resultStatus: "Revision Required", requiresComment: true, requiresDateChange: false, requiresConfirmation: true, active: true, order: 5, scope: "request" }
];

function isAction(v: unknown): v is ApprovalAction {
    if (typeof v !== "object" || v === null) return false;
    const a = v as Record<string, unknown>;
    return (
        typeof a.key === "string" && a.key.trim().length > 0 &&
        typeof a.label === "string" && a.label.trim().length > 0 &&
        typeof a.resultStatus === "string" && a.resultStatus.trim().length > 0 &&
        typeof a.requiresComment === "boolean" &&
        typeof a.requiresDateChange === "boolean" &&
        typeof a.requiresConfirmation === "boolean" &&
        typeof a.active === "boolean" &&
        typeof a.order === "number"
    );
}

function inferScope(a: ApprovalAction): ActionScope {
    if (a.scope === "request" || a.scope === "item" || a.scope === "both") return a.scope;
    if (a.requiresDateChange) return "item";
    const key = a.key.trim().toUpperCase();
    if (key === "REVISION") return "request";
    if (key === "CONFIRM" || key === "APPROVE_CHANGE") return "item";
    return "both";
}

/** Parses ApprovalConfigJson. Invalid or empty input falls back to the defaults, as in 1.x. */
export function parseActions(json: string): ApprovalAction[] {
    const fallback = DEFAULT_ACTIONS.filter((a) => a.active);
    try {
        if (!json || json.trim().length === 0) return fallback;
        const parsed: unknown = JSON.parse(json);
        if (!Array.isArray(parsed)) return fallback;
        const rows = parsed
            .filter(isAction)
            .filter((a) => a.active)
            .map((a) => ({ ...a, scope: inferScope(a) }))
            .sort((a, b) => a.order - b.order);
        return rows.length > 0 ? rows : fallback;
    } catch {
        return fallback;
    }
}

export const requestActions = (all: ApprovalAction[]): ApprovalAction[] =>
    all.filter((a) => a.scope !== "item" && !a.requiresDateChange);

export const itemActions = (all: ApprovalAction[]): ApprovalAction[] =>
    all.filter((a) => a.scope !== "request");

export const isDestructive = (a: ApprovalAction): boolean => a.key.toUpperCase() === "REJECT";
export const isApproveLike = (a: ApprovalAction): boolean => {
    const k = a.key.toUpperCase();
    return k === "APPROVE" || k === "CONFIRM";
};

const norm = (s: string | undefined): string => (s ?? "").trim().toLowerCase();

/** Statuses that mean "a decision stands". Same set the Power Fx handler treats as final. */
const FINAL = ["approved", "confirmed", "approved with changes", "rejected"];
/** Header statuses that mean the approver is done with the ticket. */
const REQUEST_DONE = [...FINAL, "partial approve", "revision required"];

export const isFinalItemStatus = (s: string): boolean => FINAL.indexOf(norm(s)) !== -1;
export const isDecidedRequestStatus = (s: string): boolean => REQUEST_DONE.indexOf(norm(s)) !== -1;
export const isRejected = (s: string): boolean => norm(s) === "rejected";

export function toneFor(status: string | undefined): Tone {
    const s = norm(status);
    if (s.length === 0) return "neutral";
    if (s === "approved" || s === "confirmed") return "success";
    if (s === "approved with changes") return "info";
    if (s === "partial approve" || s === "partially approved") return "brand";
    if (s === "rejected" || s === "cancelled") return "danger";
    if (s.indexOf("revision") !== -1) return "warning";
    if (s.indexOf("pending") !== -1 || s.indexOf("waiting") !== -1) return "warning";
    if (s.indexOf("approve") !== -1) return "success";
    if (s.indexOf("reject") !== -1) return "danger";
    return "neutral";
}

/** Tone for a history row: the label is free text written by the host ("Approve 2 item(s): ..."). */
export function toneForActionLabel(label: string): Tone {
    const s = norm(label);
    if (s.indexOf("reject") !== -1) return "danger";
    if (s.indexOf("revision") !== -1) return "warning";
    if (s.indexOf("with changes") !== -1) return "info";
    if (s.indexOf("approve") !== -1 || s.indexOf("confirm") !== -1) return "success";
    return "neutral";
}

export function matchesType(requestType: string | undefined, list: string[]): boolean {
    const t = norm(requestType);
    return t.length > 0 && list.some((x) => norm(x) === t);
}
