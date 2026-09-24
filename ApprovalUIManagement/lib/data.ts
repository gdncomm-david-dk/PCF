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

const findColumn = (columns: Column[], key: string): Column | undefined => {
    const k = squash(key);
    return k.length === 0 ? undefined : columns.find((c) => squash(c.name) === k || squash(c.displayName) === k || squash(c.alias) === k);
};

/**
 * Resolves a logical column. The configured field name is tried first, then the fallbacks;
 * each is compared to the column's name, display name and alias with case, spaces and
 * punctuation ignored. As in 1.6, when nothing matches the metadata the first non-empty
 * candidate is still returned and read by name: canvas datasets do not always list every
 * column in `columns`.
 */
function resolve(columns: Column[], configured: string | undefined, fallbacks: string[]): string | undefined {
    const candidates = [configured ?? "", ...fallbacks].map((c) => c.trim()).filter((c) => c.length > 0);
    for (const c of candidates) {
        const hit = findColumn(columns, c);
        if (hit) return hit.name;
    }
    return candidates[0];
}

/** Every spelling a value may be stored under: the name, the matching column's alias / name / display name, and lower/upper first letter. */
function keysFor(name: string, columns: Column[]): string[] {
    const keys: string[] = [name];
    const col = findColumn(columns, name);
    if (col) [col.alias, col.name, col.displayName].forEach((k) => k && keys.indexOf(k) === -1 && keys.push(k));
    [name.charAt(0).toLowerCase() + name.slice(1), name.charAt(0).toUpperCase() + name.slice(1)].forEach((k) => keys.indexOf(k) === -1 && keys.push(k));
    return keys;
}

function readValue(rec: EntityRecord, name: string, columns: Column[]): unknown {
    const keys = keysFor(name, columns);
    for (const k of keys) {
        try {
            const v = rec.getValue(k);
            if (v !== null && v !== undefined && v !== "") return v;
        } catch {
            /* try the next spelling */
        }
    }
    for (const k of keys) {
        try {
            const v = rec.getFormattedValue(k);
            if (v !== null && v !== undefined && v !== "") return v;
        } catch {
            /* try the next spelling */
        }
    }
    return undefined;
}

function text(v: unknown): string | undefined {
    if (v === null || v === undefined) return undefined;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
    if (typeof v === "object") {
        // Choice / person / lookup shapes: { Value }, { name }, { DisplayName }, { Email } ...
        const o = v as Record<string, unknown>;
        const inner = o.Value ?? o.value ?? o.DisplayName ?? o.name ?? o.Email;
        if (inner !== undefined) return text(inner);
    }
    const s = String(v).trim();
    return s.length > 0 ? s : undefined;
}

function date(v: unknown): Date | undefined {
    if (v === null || v === undefined || v === "") return undefined;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v;
    if (typeof v === "string") {
        // a bare yyyy-mm-dd is a calendar day, not UTC midnight
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    }
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

const logged: Record<string, string> = {};
/** One console.debug per dataset shape, like 1.6: what is bound, and what was resolved to what. */
function logMapping(label: string, columns: Column[], map: Record<string, string | undefined>): void {
    try {
        const sig = JSON.stringify([columns.map((c) => [c.name, c.alias, c.displayName]), map]);
        if (logged[label] === sig) return;
        logged[label] = sig;
        const unbound = Object.keys(map).filter((k) => map[k] && !findColumn(columns, map[k] as string));
        console.debug(`[ApprovalUIManagement] ${label} columns`, columns.map((c) => ({ name: c.name, alias: c.alias, displayName: c.displayName })));
        console.debug(`[ApprovalUIManagement] ${label} resolved columns`, map);
        if (unbound.length > 0)
            console.debug(`[ApprovalUIManagement] ${label} NOT in column metadata - reading by name; add them in the Fields pane for reliable values`, unbound.map((k) => `${k} -> ${map[k]}`));
    } catch {
        /* logging must never break rendering */
    }
}

function readDataset<T>(ds: DataSet | undefined, spec: Spec<T>, required: boolean): DatasetState<T> {
    if (!ds) {
        return { rows: [], loading: false, error: required ? `No data source is bound to the ${spec.label} dataset.` : null, hasMore: false };
    }
    try {
        const loading = !!ds.loading;
        const hasMore = !!ds.paging?.hasNextPage;
        if (ds.error) return { rows: [], loading, error: ds.errorMessage || `Unable to load ${spec.label}s.`, hasMore };
        const columns = ds.columns ?? [];
        const map: Record<string, string | undefined> = {};
        for (const key of Object.keys(spec.fields)) {
            const [configured, ...fallbacks] = spec.fields[key];
            map[key] = resolve(columns, configured, fallbacks);
        }
        const ids = ds.sortedRecordIds ?? [];
        if (ids.length > 0) logMapping(spec.label.toUpperCase(), columns, map);

        const rows: T[] = [];
        for (const id of ids) {
            const rec: EntityRecord = ds.records[id];
            if (!rec) continue;
            const get = (key: string): unknown => (map[key] ? readValue(rec, map[key] as string, columns) : undefined);
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
    // The approver comes from ApprovedBy. The old default "approver" no longer overrides that;
    // the Approver column is only read when ApprovedBy is empty.
    const approverField = p(params, "approverField");
    const customApprover = approverField && approverField.trim().toLowerCase() !== "approver" ? approverField : undefined;
    return readDataset<ApprovalRequest>(
        ds,
        {
            label: "request",
            fields: {
                requestId: [p(params, "requestIdField"), "requestId"],
                campaign: [p(params, "campaignField"), "campaign", "campaignName"],
                requestType: [p(params, "requestTypeField"), "requestType", "type"],
                start: [p(params, "requestedStartDateField"), "requestedStartDate", "startDate"],
                end: [p(params, "requestedEndDateField"), "requestedEndDate", "endDate"],
                submittedBy: [p(params, "submittedByField"), "submittedBy", "requester"],
                approver: [customApprover, "approvedBy"],
                approverFallback: ["approver"],
                status: [p(params, "statusField"), "status", "requestStatus"]
            },
            build: (get, id) => ({
                requestId: text(get("requestId")) ?? id,
                campaign: text(get("campaign")) ?? "",
                requestType: text(get("requestType")),
                requestedStartDate: date(get("start")),
                requestedEndDate: date(get("end")),
                submittedBy: text(get("submittedBy")),
                approver: text(get("approver")) ?? text(get("approverFallback")),
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
                itemId: [p(params, "itemIdField"), "itemId"],
                requestId: [p(params, "itemRequestIdField"), "itemRequestId", "requestId"],
                itemName: [p(params, "itemNameField"), "itemName", "name", "title"],
                itemType: [p(params, "itemTypeField"), "itemType", "type"],
                status: [p(params, "itemStatusField"), "itemStatus", "status"],
                start: [p(params, "itemStartDateField"), "startDate", "itemStartDate", "availableFrom"],
                end: [p(params, "itemEndDateField"), "endDate", "itemEndDate", "availableTo"],
                placementId: [p(params, "itemPlacementIdField"), "placementId", "itemPlacementId"]
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
                historyId: [p(params, "historyIdField"), "historyId"],
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
                commentId: [p(params, "commentIdField"), "commentId"],
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
