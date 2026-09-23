import * as React from "react";
import {
    ApprovalAction,
    ApprovalItem,
    ApprovalRequest,
    Breakpoint,
    CommentEntry,
    ControlConfig,
    DatasetState,
    HistoryEntry,
    ItemActionPayload,
    RequestActionPayload
} from "../lib/types";
import { CASCADE_TYPES, itemActions, matchesType, parseActions, requestActions } from "../lib/actions";
import { scopeTo } from "../lib/data";
import { plural } from "../lib/format";
import { Inbox } from "./Inbox";
import { Detail } from "./Detail";
import { DateChangeDialog, DecisionDialog, DecisionTarget } from "./Dialogs";
import { cx, EmptyState, ErrorState } from "./Primitives";
import { CheckIcon, LayersIcon } from "./Icons";

export interface AppCallbacks {
    onOpenRequest: (id: string) => void;
    onRequestSelection: (ids: string[]) => void;
    onRequestAction: (payload: RequestActionPayload) => void;
    onItemSelection: (ids: string[]) => void;
    onItemAction: (payload: ItemActionPayload) => void;
    onPendingDateChange: (itemId: string) => void;
    onRefresh: () => void;
    onLoadMoreRequests: () => void;
}

export interface AppProps extends AppCallbacks {
    config: ControlConfig;
    requests: DatasetState<ApprovalRequest>;
    items: DatasetState<ApprovalItem>;
    history: DatasetState<HistoryEntry>;
    comments: DatasetState<CommentEntry>;
    isProcessing: boolean;
    itemAvailabilityJson: string;
}

/** An action that was sent and whose result has not come back from the lists yet. */
interface Inflight {
    at: number;
    expected: string;
}
const INFLIGHT_TIMEOUT_MS = 20000;

function useBreakpoint(): [React.RefObject<HTMLDivElement>, Breakpoint] {
    const ref = React.useRef<HTMLDivElement>(null);
    const [bp, setBp] = React.useState<Breakpoint>("desktop");
    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = (w: number): void => setBp(w <= 767 ? "mobile" : w <= 1099 ? "tablet" : "desktop");
        measure(el.getBoundingClientRect().width);
        if (typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver((entries) => entries.forEach((e) => measure(e.contentRect.width)));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, bp];
}

type DialogState =
    | { kind: "decision"; target: DecisionTarget; ids: string[] }
    | { kind: "dates"; action: ApprovalAction; item: ApprovalItem }
    | null;

export const App: React.FC<AppProps> = (props) => {
    const { config, requests, isProcessing } = props;
    const [rootRef, breakpoint] = useBreakpoint();
    const [openId, setOpenId] = React.useState("");
    const [dialog, setDialog] = React.useState<DialogState>(null);
    const [toast, setToast] = React.useState<string | null>(null);
    const [resetKey, setResetKey] = React.useState(0);
    const [reqInflight, setReqInflight] = React.useState<Map<string, Inflight>>(new Map());
    const [itemInflight, setItemInflight] = React.useState<Map<string, Inflight>>(new Map());
    const [refreshing, setRefreshing] = React.useState(false);

    const actions = React.useMemo(() => parseActions(config.approvalConfigJson), [config.approvalConfigJson]);
    const reqActs = React.useMemo(() => requestActions(actions), [actions]);
    const itemActs = React.useMemo(() => (config.allowItemActions ? itemActions(actions) : []), [actions, config.allowItemActions]);

    const open = requests.rows.find((r) => r.requestId === openId);
    const requestLevel =
        !!open && config.allowRequestActions && (config.requestLevelTypes.length === 0 || matchesType(open.requestType, config.requestLevelTypes));
    // whether the handler cascades a whole-request APPROVE / REJECT down to the items
    const cascades = !!open && matchesType(open.requestType, CASCADE_TYPES);

    const scopedItems = React.useMemo(() => (open ? scopeTo(props.items.rows, open.requestId) : []), [props.items.rows, open]);
    const scopedHistory = React.useMemo(() => (open ? scopeTo(props.history.rows, open.requestId) : []), [props.history.rows, open]);
    const scopedComments = React.useMemo(() => (open ? scopeTo(props.comments.rows, open.requestId) : []), [props.comments.rows, open]);

    // --- outputs -----------------------------------------------------------------
    const openRequest = (id: string): void => {
        setOpenId(id);
        setDialog(null);
        setResetKey((k) => k + 1);
        props.onOpenRequest(id);
        props.onRequestSelection(id ? [id] : []);
    };

    // A request that disappears from the list (filtered away by the host) closes the pane.
    React.useEffect(() => {
        if (openId && !requests.loading && requests.rows.length > 0 && !open) openRequest("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openId, open, requests.loading, requests.rows.length]);

    // --- in-flight bookkeeping ------------------------------------------------------
    // cleared when the list reports the expected status, when IsProcessing drops, or on timeout
    React.useEffect(() => {
        const now = Date.now();
        const settle = <T extends { status: string }>(m: Map<string, Inflight>, find: (id: string) => T | undefined): Map<string, Inflight> => {
            let changed = false;
            const next = new Map(m);
            next.forEach((v, id) => {
                const row = find(id);
                if (now - v.at > INFLIGHT_TIMEOUT_MS || (row && row.status.trim().toLowerCase() === v.expected)) {
                    next.delete(id);
                    changed = true;
                }
            });
            return changed ? next : m;
        };
        setReqInflight((m) => (m.size === 0 ? m : settle(m, (id) => requests.rows.find((r) => r.requestId === id))));
        setItemInflight((m) => (m.size === 0 ? m : settle(m, (id) => props.items.rows.find((i) => i.itemId === id))));
    }, [requests.rows, props.items.rows]);

    React.useEffect(() => {
        if (reqInflight.size === 0 && itemInflight.size === 0) return;
        const t = window.setTimeout(() => {
            setReqInflight(new Map());
            setItemInflight(new Map());
        }, INFLIGHT_TIMEOUT_MS + 500);
        return () => window.clearTimeout(t);
    }, [reqInflight, itemInflight]);

    const wasProcessing = React.useRef(isProcessing);
    React.useEffect(() => {
        if (wasProcessing.current && !isProcessing) {
            setReqInflight(new Map());
            setItemInflight(new Map());
        }
        wasProcessing.current = isProcessing;
    }, [isProcessing]);

    React.useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(t);
    }, [toast]);

    React.useEffect(() => {
        if (!refreshing) return;
        const t = window.setTimeout(() => setRefreshing(false), 1200);
        return () => window.clearTimeout(t);
    }, [refreshing]);

    // --- sending -------------------------------------------------------------------
    const sendRequest = (action: ApprovalAction, comment: string): void => {
        if (!open) return;
        const payload: RequestActionPayload = { action: action.key, requestId: [open.requestId] };
        if (comment.trim().length > 0) payload.comment = comment.trim();
        const at = Date.now();
        setReqInflight((m) => new Map(m).set(open.requestId, { at, expected: action.resultStatus.trim().toLowerCase() }));
        // the handler cascades APPROVE / REJECT to every item of a request-level type
        const key = action.key.toUpperCase();
        if (cascades && (key === "APPROVE" || key === "REJECT")) {
            const expected = key === "APPROVE" ? "approved" : "rejected";
            setItemInflight((m) => {
                const n = new Map(m);
                scopedItems.forEach((i) => n.set(i.itemId, { at, expected }));
                return n;
            });
        }
        props.onRequestAction(payload);
        setDialog(null);
        setResetKey((k) => k + 1);
        setToast(`${action.label} sent for ${open.requestId}`);
    };

    const sendItems = (action: ApprovalAction, ids: string[], comment: string, start?: string, end?: string): void => {
        if (ids.length === 0) return;
        const payload: ItemActionPayload = { action: action.key, itemId: ids.slice() };
        if (comment.trim().length > 0) payload.comment = comment.trim();
        if (start) payload.revisedStartDate = start;
        if (end) payload.revisedEndDate = end;
        const at = Date.now();
        setItemInflight((m) => {
            const n = new Map(m);
            ids.forEach((id) => n.set(id, { at, expected: action.resultStatus.trim().toLowerCase() }));
            return n;
        });
        props.onItemAction(payload);
        props.onPendingDateChange("");
        setDialog(null);
        setResetKey((k) => k + 1);
        setToast(`${action.label} sent for ${plural(ids.length, "item")}`);
    };

    const onRequestAction = (a: ApprovalAction): void => {
        if (!open) return;
        if (!a.requiresConfirmation && !a.requiresComment) return sendRequest(a, "");
        const count = scopedItems.length;
        const key = a.key.toUpperCase();
        setDialog({
            kind: "decision",
            ids: [open.requestId],
            target: {
                level: "request",
                action: a,
                names: [open.campaign || open.requestId],
                note:
                    cascades && (key === "APPROVE" || key === "REJECT") && count > 0
                        ? `Also sets all ${plural(count, "item")} to ${key === "APPROVE" ? "Approved" : "Rejected"} and updates their bookings.`
                        : undefined
            }
        });
    };

    const onItemAction = (a: ApprovalAction, ids: string[]): void => {
        const picked = scopedItems.filter((i) => ids.indexOf(i.itemId) !== -1);
        if (picked.length === 0) return;
        if (a.requiresDateChange) {
            if (picked.length !== 1) return;
            props.onPendingDateChange(picked[0].itemId);
            setDialog({ kind: "dates", action: a, item: picked[0] });
            return;
        }
        if (!a.requiresConfirmation && !a.requiresComment) return sendItems(a, ids, "");
        setDialog({
            kind: "decision",
            ids: picked.map((i) => i.itemId),
            target: { level: "item", action: a, names: picked.map((i) => i.itemName || i.itemId) }
        });
    };

    const closeDialog = (): void => {
        if (dialog?.kind === "dates") props.onPendingDateChange("");
        setDialog(null);
    };

    const refresh = (): void => {
        setRefreshing(true);
        props.onRefresh();
    };

    // --- layout ----------------------------------------------------------------------
    const detailFirst = breakpoint !== "desktop" && !!open;
    const detail = open ? (
        <Detail
            key={open.requestId}
            request={open}
            breakpoint={breakpoint}
            items={{ ...props.items, rows: scopedItems }}
            history={{ ...props.history, rows: scopedHistory }}
            comments={{ ...props.comments, rows: scopedComments }}
            requestLevel={requestLevel}
            cascades={cascades}
            requestActions={reqActs}
            itemActions={itemActs}
            requestBusy={reqInflight.has(open.requestId)}
            inflightItems={new Set(itemInflight.keys())}
            disabled={isProcessing}
            resetKey={resetKey}
            onClose={() => openRequest("")}
            onRequestAction={onRequestAction}
            onItemAction={onItemAction}
            onItemSelectionChange={props.onItemSelection}
        />
    ) : null;

    return (
        <div className="uam-root" data-breakpoint={breakpoint} ref={rootRef}>
            {isProcessing && <div className="uam-topbar" role="progressbar" aria-label="Saving" />}
            {requests.error && requests.rows.length === 0 && !requests.loading ? (
                <ErrorState message={requests.error} />
            ) : (
                <div className={cx("uam-shell", open && "uam-shell--open")}>
                    {!detailFirst && (
                        <aside className="uam-pane uam-pane--inbox">
                            <Inbox
                                config={config}
                                breakpoint={breakpoint}
                                requests={requests.rows}
                                loading={requests.loading}
                                error={requests.error}
                                hasMore={requests.hasMore}
                                onLoadMore={props.onLoadMoreRequests}
                                allItems={props.items.rows}
                                openRequestId={openId}
                                onOpen={openRequest}
                                onRefresh={refresh}
                                refreshing={refreshing}
                            />
                        </aside>
                    )}
                    {breakpoint === "desktop" ? (
                        <main className="uam-pane uam-pane--detail">
                            {detail ?? (
                                <EmptyState
                                    icon={<LayersIcon size={28} />}
                                    title="Select a request to review"
                                    subtitle="Campaign requests can be decided as a whole; every request can be decided item by item."
                                />
                            )}
                        </main>
                    ) : (
                        detailFirst && <main className="uam-pane uam-pane--detail">{detail}</main>
                    )}
                </div>
            )}

            {dialog?.kind === "decision" && (
                <DecisionDialog
                    target={dialog.target}
                    breakpoint={breakpoint}
                    onCancel={closeDialog}
                    onConfirm={(comment) =>
                        dialog.target.level === "request" ? sendRequest(dialog.target.action, comment) : sendItems(dialog.target.action, dialog.ids, comment)
                    }
                />
            )}
            {dialog?.kind === "dates" && (
                <DateChangeDialog
                    item={dialog.item}
                    action={dialog.action}
                    availabilityJson={props.itemAvailabilityJson}
                    breakpoint={breakpoint}
                    onCancel={closeDialog}
                    onConfirm={(comment, start, end) => sendItems(dialog.action, [dialog.item.itemId], comment, start, end)}
                />
            )}

            {toast && (
                <div className="uam-toast" role="status">
                    <CheckIcon size={16} />
                    {toast}
                </div>
            )}
        </div>
    );
};
