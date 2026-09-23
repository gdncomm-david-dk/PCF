import * as React from "react";
import { ApprovalAction, ApprovalItem, Breakpoint } from "../lib/types";
import { isApproveLike, isDestructive, isFinalItemStatus, toneFor } from "../lib/actions";
import { days, period, plural } from "../lib/format";
import { Badge, Button, cx, EmptyState, ErrorState, Skeleton } from "./Primitives";
import { CalendarEditIcon, CheckIcon, MapPinIcon, SpinnerIcon, UndoIcon, XCircleIcon } from "./Icons";

type ItemFilter = "all" | "pending" | "decided";

export interface ItemsPanelProps {
    items: ApprovalItem[];
    loading: boolean;
    error: string | null;
    actions: ApprovalAction[];
    breakpoint: Breakpoint;
    /** item ids whose action was sent and whose new status has not arrived yet */
    inflight: Set<string>;
    disabled: boolean;
    /** changes whenever the selection should be cleared (after an action is sent) */
    resetKey: number;
    onSelectionChange: (ids: string[]) => void;
    onAction: (action: ApprovalAction, ids: string[]) => void;
}

function iconFor(a: ApprovalAction): React.ReactNode {
    if (a.requiresDateChange) return <CalendarEditIcon size={14} />;
    if (isDestructive(a)) return <XCircleIcon size={14} />;
    if (isApproveLike(a)) return <CheckIcon size={14} />;
    return undefined;
}

function variantFor(a: ApprovalAction): "primary" | "outline" | "danger-ghost" {
    if (isDestructive(a)) return "danger-ghost";
    if (isApproveLike(a)) return "primary";
    return "outline";
}

export const ItemsPanel: React.FC<ItemsPanelProps> = (props) => {
    const { items, actions, inflight, disabled, breakpoint, onAction, onSelectionChange } = props;
    const [filter, setFilter] = React.useState<ItemFilter>("all");
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        setSelected(new Set());
        setExpanded(new Set());
    }, [props.resetKey]);

    // drop ids that are no longer on the list
    const ids = React.useMemo(() => items.map((i) => i.itemId), [items]);
    const selectedIds = React.useMemo(() => ids.filter((id) => selected.has(id)), [ids, selected]);
    const selKey = selectedIds.join("|");
    const lastKey = React.useRef("");
    React.useEffect(() => {
        if (selKey !== lastKey.current) {
            lastKey.current = selKey;
            onSelectionChange(selectedIds);
        }
    }, [selKey, selectedIds, onSelectionChange]);

    const pendingCount = items.filter((i) => !isFinalItemStatus(i.status)).length;
    const decidedCount = items.length - pendingCount;
    const visible = items.filter((i) => (filter === "all" ? true : filter === "pending" ? !isFinalItemStatus(i.status) : isFinalItemStatus(i.status)));
    const selectable = visible.filter((i) => !inflight.has(i.itemId));
    const allVisibleSelected = selectable.length > 0 && selectable.every((i) => selected.has(i.itemId));

    const toggle = (id: string): void =>
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    const toggleAll = (): void =>
        setSelected((s) => {
            const n = new Set(s);
            if (allVisibleSelected) selectable.forEach((i) => n.delete(i.itemId));
            else selectable.forEach((i) => n.add(i.itemId));
            return n;
        });
    const selectPending = (): void => setSelected(new Set(items.filter((i) => !isFinalItemStatus(i.status) && !inflight.has(i.itemId)).map((i) => i.itemId)));

    if (props.loading && items.length === 0) return <Skeleton rows={3} />;
    if (props.error) return <ErrorState title="Unable to load items" message={props.error} />;
    if (items.length === 0) return <EmptyState title="No items on this request" subtitle="There are no placements to decide." />;

    const compact = breakpoint === "mobile";
    const readOnly = actions.length === 0;
    const bulkActions = actions.filter((a) => !a.requiresDateChange || selectedIds.length === 1);
    const hiddenDateActions = selectedIds.length > 1 && actions.some((a) => a.requiresDateChange);

    return (
        <div className="uam-items">
            <div className="uam-items__bar">
                <div className="uam-seg" role="tablist" aria-label="Filter items">
                    {(
                        [
                            ["all", "All", items.length],
                            ["pending", "Pending", pendingCount],
                            ["decided", "Decided", decidedCount],
                        ] as [ItemFilter, string, number][]
                    ).map(([k, label, n]) => (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            aria-selected={filter === k}
                            className={cx("uam-seg__btn", filter === k && "uam-seg__btn--active")}
                            onClick={() => setFilter(k)}
                        >
                            {label} <span className="uam-seg__n">{n}</span>
                        </button>
                    ))}
                </div>
                {pendingCount > 0 && !disabled && !readOnly && (
                    <button type="button" className="uam-link" onClick={selectPending}>
                        Select all pending
                    </button>
                )}
            </div>

            <div className="uam-item-list" role="list">
                {!readOnly && (
                    <label className="uam-item-list__head">
                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} disabled={disabled || selectable.length === 0} />
                        <span>{selectedIds.length > 0 ? `${plural(selectedIds.length, "item")} selected` : `Select ${filter === "all" ? "all" : filter}`}</span>
                    </label>
                )}
                {visible.length === 0 && <p className="uam-muted uam-item-list__none">No {filter} items.</p>}
                {visible.map((item) => {
                    const busy = inflight.has(item.itemId);
                    const final = isFinalItemStatus(item.status);
                    const open = !final || expanded.has(item.itemId);
                    const n = days(item.startDate, item.endDate);
                    return (
                        <div
                            key={item.itemId}
                            role="listitem"
                            className={cx("uam-item", selected.has(item.itemId) && "uam-item--selected", busy && "uam-item--busy", final && "uam-item--final")}
                        >
                            {!readOnly && (
                                <input
                                    type="checkbox"
                                    className="uam-item__check"
                                    checked={selected.has(item.itemId)}
                                    onChange={() => toggle(item.itemId)}
                                    disabled={disabled || busy}
                                    aria-label={`Select ${item.itemName}`}
                                />
                            )}
                            <div className="uam-item__body">
                                <div className="uam-item__top">
                                    <span className="uam-item__name">{item.itemName || item.itemId}</span>
                                    {busy ? (
                                        <span className="uam-badge uam-badge--neutral">
                                            <SpinnerIcon size={12} className="uam-spin" /> Updating
                                        </span>
                                    ) : (
                                        <Badge tone={toneFor(item.status)} label={item.status || "Pending"} dot />
                                    )}
                                </div>
                                <div className="uam-item__meta">
                                    {item.itemType && <span>{item.itemType}</span>}
                                    {item.placementId && (
                                        <span className="uam-item__placement">
                                            <MapPinIcon size={12} />
                                            {item.placementId}
                                        </span>
                                    )}
                                    {(item.startDate || item.endDate) && (
                                        <span className="uam-item__dates">
                                            {period(item.startDate, item.endDate)}
                                            {n ? ` · ${plural(n, "day")}` : ""}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!readOnly && (
                                <div className={cx("uam-item__actions", compact && "uam-item__actions--compact")}>
                                    {open ? (
                                        actions.map((a) => (
                                            <Button
                                                key={a.key}
                                                size="sm"
                                                variant={variantFor(a)}
                                                icon={iconFor(a)}
                                                disabled={disabled || busy}
                                                onClick={() => onAction(a, [item.itemId])}
                                                title={`${a.label} — ${item.itemName}`}
                                            >
                                                {compact && a.requiresDateChange ? "Change dates" : a.label}
                                            </Button>
                                        ))
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            icon={<UndoIcon size={14} />}
                                            disabled={disabled || busy}
                                            onClick={() => setExpanded((s) => new Set(s).add(item.itemId))}
                                        >
                                            Change decision
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedIds.length > 0 && !readOnly && (
                <div className="uam-bulk" role="region" aria-label="Bulk item actions">
                    <span className="uam-bulk__count">{plural(selectedIds.length, "item")} selected</span>
                    <div className="uam-bulk__actions">
                        {bulkActions.map((a) => (
                            <Button
                                key={a.key}
                                size="sm"
                                variant={isDestructive(a) ? "danger" : isApproveLike(a) ? "primary" : "outline"}
                                icon={iconFor(a)}
                                disabled={disabled}
                                onClick={() => onAction(a, selectedIds)}
                            >
                                {a.label}
                            </Button>
                        ))}
                        <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                            Clear
                        </Button>
                    </div>
                    {hiddenDateActions && <span className="uam-bulk__note">Changing dates works on one item at a time.</span>}
                </div>
            )}
        </div>
    );
};
