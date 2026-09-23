import {
    ApprovalItem,
    ApprovalRequest,
    CommentEntry,
    DatasetState,
    HistoryEntry
} from "./types";

type DataSet = ComponentFramework.PropertyTypes.DataSet;
type Column = ComponentFramework.PropertyHelper.DataSetApi.Column;
type EntityRecord = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

const squash = (s: string | undefined | null): string => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Resolves a logical column name. The configured field name is tried first, then the
 * fallbacks; each is compared to the column's name, display name and alias with case,
 * spaces and punctuation ignored. Same rule the 1.x control used, so existing
 * field-mapping properties keep working.
 */
function resolve(columns: Column[], configured: string | undefined, fallbacks: string[]): string | undefined {
    const candidates = [configured ?? "", ...fallbacks].map(squash).filter((c) => c.length > 0);
    for (const c of candidates) {
        const hit = columns.find((col) => squash(col.name) === c || squash(col.displayName) === c || squash(col.alias) === c);
        if (hit) return hit.name;
    }
    return undefined;
}

function text(v: unknown): string | undefined {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "object") {
        // Choice / lookup shapes: { Value }, { name }, { Email } ...
        const o = v as Record<string, unknown>;
        const inner = o.Value ?? o.value ?? o.name ?? o.DisplayName ?? o.Email;
        if (inner !== undefined) return text(inner);
    }
    const s = String(v).trim();
    return s.length > 0 ? s : undefined;
}

function date(v: unknown): Date | undefined {
    if (v === null || v === undefined || v === "") return undefined;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
    if (typeof v === "string" || typeof v === "number") {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
}

interface Spec<T> {
    /** logical key -> [configured field name, ...fallback names] */
    fields: Record<string, [string | undefined, ...string[]]>;
    build: (get: (key: string) => unknown, recordId: string) => T | null;
    label: string;
}

function readDataset<T>(ds: DataSet | undefined, spec: Spec<T>, required: boolean): DatasetState<T> {
    if (!ds) {
        return { rows: [], loading: false, error: required ? `No data source is bound to the ${spec.label} dataset.` : null, hasMore: false };
    }
    try {
        const loading = !!ds.loading;
        const hasMore = !!ds.paging?.hasNextPage;
        const columns = ds.columns ?? [];
        if (columns.length === 0) return { rows: [], loading, error: null, hasMore };

        const map: Record<string, string | undefined> = {};
        for (const key of Object.keys(spec.fields)) {
            const [configured, ...fallbacks] = spec.fields[key];
            map[key] = resolve(columns, configured, fallbacks);
        }
        if (Object.values(map).every((v) => !v)) {
            return {
                rows: [],
                loading,
                error: `None of the ${spec.label} columns could be matched to the bound data source. Check the field mappings or the bound column names.`,
                hasMore
            };
        }
        if (ds.error) return { rows: [], loading, error: ds.errorMessage || `Unable to load ${spec.label}.`, hasMore };

        const rows: T[] = [];
        for (const id of ds.sortedRecordIds ?? []) {
            const rec: EntityRecord = ds.records[id];
            if (!rec) continue;
            const get = (key: string): unknown => {
                const col = map[key];
                if (!col) return undefined;
                try {
                    return rec.getValue(col);
                } catch {
                    return undefined;
                }
            };
            const row = spec.build(get, id);
            if (row) rows.push(row);
        }
        return { rows, loading, error: null, hasMore };
    } catch {
        return { rows: [], loading: false, error: `Unable to read the bound ${spec.label} data source.`, hasMore: false };
    }
}

type Params = Record<string, { raw?: unknown } | undefined>;
const p = (params: Params, name: string): string | undefined => {
    const raw = params[name]?.raw;
    return typeof raw === "string" && raw.trim().length > 0 ? raw : undefined;
};

export function readRequests(ds: DataSet | undefined, params: Params): DatasetState<ApprovalRequest> {
    return readDataset<ApprovalRequest>(
        ds,
        {
            label: "request",
            fields: {
                requestId: [p(params, "requestIdField"), "requestId", "id"],
                campaign: [p(params, "campaignField"), "campaign", "campaignName"],
                requestType: [p(params, "requestTypeField"), "requestType", "type"],
                start: [p(params, "requestedStartDateField"), "requestedStartDate", "startDate"],
                end: [p(params, "requestedEndDateField"), "requestedEndDate", "endDate"],
                submittedBy: [p(params, "submittedByField"), "submittedBy", "requester"],
                approver: [p(params, "approverField"), "approver"],
                status: [p(params, "statusField"), "status", "requestStatus"]
            },
            build: (get, id) => ({
                requestId: text(get("requestId")) ?? id,
                campaign: text(get("campaign")) ?? "",
                requestType: text(get("requestType")),
                requestedStartDate: date(get("start")),
                requestedEndDate: date(get("end")),
                submittedBy: text(get("submittedBy")),
                approver: text(get("approver")),
                status: text(get("status")) ?? ""
            })
        },
        true
    );
}

export function readItems(ds: DataSet | undefined, params: Params): DatasetState<ApprovalItem> {
    return readDataset<ApprovalItem>(
        ds,
        {
            label: "item",
            fields: {
                itemId: [p(params, "itemIdField"), "itemId", "id"],
                requestId: [p(params, "itemRequestIdField"), "itemRequestId", "requestId"],
                itemName: [p(params, "itemNameField"), "itemName", "name", "title"],
                itemType: [p(params, "itemTypeField"), "itemType", "type"],
                status: [p(params, "itemStatusField"), "itemStatus", "status"],
                start: [p(params, "itemStartDateField"), "itemStartDate", "startDate"],
                end: [p(params, "itemEndDateField"), "itemEndDate", "endDate"],
                placementId: [p(params, "itemPlacementIdField"), "itemPlacementId", "placementId"]
            },
            build: (get, id) => ({
                itemId: text(get("itemId")) ?? id,
                requestId: text(get("requestId")) ?? "",
                itemName: text(get("itemName")) ?? "",
                itemType: text(get("itemType")),
                status: text(get("status")) ?? "",
                startDate: date(get("start")),
                endDate: date(get("end")),
                placementId: text(get("placementId"))
            })
        },
        false
    );
}

export function readHistory(ds: DataSet | undefined, params: Params): DatasetState<HistoryEntry> {
    return readDataset<HistoryEntry>(
        ds,
        {
            label: "history",
            fields: {
                historyId: [p(params, "historyIdField"), "historyId", "id"],
                requestId: [p(params, "historyRequestIdField"), "historyRequestId", "requestId"],
                actionLabel: [p(params, "historyActionLabelField"), "actionLabel", "action"],
                actor: [p(params, "historyActorField"), "actor", "actionBy"],
                timestamp: [p(params, "historyTimestampField"), "timestamp", "historyTimestamp"],
                comment: [p(params, "historyCommentField"), "comment", "historyComment"]
            },
            build: (get, id) => ({
                historyId: text(get("historyId")) ?? id,
                requestId: text(get("requestId")) ?? "",
                actionLabel: text(get("actionLabel")) ?? "",
                actor: text(get("actor")) ?? "",
                timestamp: date(get("timestamp")) ?? new Date(0),
                comment: text(get("comment"))
            })
        },
        false
    );
}

export function readComments(ds: DataSet | undefined, params: Params): DatasetState<CommentEntry> {
    return readDataset<CommentEntry>(
        ds,
        {
            label: "comment",
            fields: {
                commentId: [p(params, "commentIdField"), "commentId", "id"],
                requestId: [p(params, "commentRequestIdField"), "commentRequestId", "requestId"],
                author: [p(params, "commentAuthorField"), "author", "createdBy"],
                timestamp: [p(params, "commentTimestampField"), "commentTimestamp", "timestamp"],
                text: [p(params, "commentTextField"), "text", "commentText", "comment"]
            },
            build: (get, id) => ({
                commentId: text(get("commentId")) ?? id,
                requestId: text(get("requestId")) ?? "",
                author: text(get("author")) ?? "",
                timestamp: date(get("timestamp")) ?? new Date(0),
                text: text(get("text")) ?? ""
            })
        },
        false
    );
}

/** Keeps only rows for the open request. Rows with a blank id are kept (the host filters). */
export function scopeTo<T extends { requestId: string }>(rows: T[], requestId: string): T[] {
    const want = requestId.trim().toLowerCase();
    return rows.filter((r) => {
        const got = r.requestId.trim().toLowerCase();
        return got.length === 0 || got === want;
    });
}
