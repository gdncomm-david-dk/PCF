import * as React from "react";
import { ApprovalAction, ApprovalItem, ApprovalRequest, Breakpoint, CommentEntry, DatasetState, HistoryEntry } from "../lib/types";
import { isApproveLike, isDecidedRequestStatus, isDestructive, isFinalItemStatus, toneFor, toneForActionLabel } from "../lib/actions";
import { dateTime, days, displayName, period, plural, relative } from "../lib/format";
import { Avatar, Badge, Button, cx, DecisionBar, EmptyState, ErrorState, Skeleton, TypeChip } from "./Primitives";
import { ItemsPanel } from "./ItemsPanel";
import { BackIcon, CheckIcon, CloseIcon, HistoryIcon, InfoIcon, LayersIcon, MessageIcon, SpinnerIcon, XCircleIcon } from "./Icons";

type DetailTab = "items" | "activity" | "comments";

export interface DetailProps {
    request: ApprovalRequest;
    breakpoint: Breakpoint;
    items: DatasetState<ApprovalItem>;
    history: DatasetState<HistoryEntry>;
    comments: DatasetState<CommentEntry>;
    requestLevel: boolean;
    requestActions: ApprovalAction[];
    itemActions: ApprovalAction[];
    requestBusy: boolean;
    inflightItems: Set<string>;
    disabled: boolean;
    resetKey: number;
    onClose: () => void;
    onRequestAction: (a: ApprovalAction) => void;
    onItemAction: (a: ApprovalAction, ids: string[]) => void;
    onItemSelectionChange: (ids: string[]) => void;
}

export const Detail: React.FC<DetailProps> = (p) => {
    const { request: r, items, history, comments, breakpoint } = p;
    const [tab, setTab] = React.useState<DetailTab>("items");

    const stats = React.useMemo(() => {
        const s = { total: items.rows.length, approved: 0, changed: 0, rejected: 0, pending: 0 };
        items.rows.forEach((i) => {
            const st = i.status.trim().toLowerCase();
            if (st === "rejected") s.rejected++;
            else if (st === "approved with changes") s.changed++;
            else if (isFinalItemStatus(i.status)) s.approved++;
            else s.pending++;
        });
        return s;
    }, [items.rows]);
    const decided = stats.total - stats.pending;
    const n = days(r.requestedStartDate, r.requestedEndDate);

    const tabs: [DetailTab, string, React.ReactNode, number][] = [
        ["items", "Items", <LayersIcon size={14} key="i" />, items.rows.length],
        ["activity", "Activity", <HistoryIcon size={14} key="h" />, history.rows.length],
        ["comments", "Comments", <MessageIcon size={14} key="c" />, comments.rows.length]
    ];

    return (
        <div className="uam-detail">
            <div className="uam-detail__head">
                <div className="uam-detail__nav">
                    {breakpoint !== "desktop" ? (
                        <button type="button" className="uam-back" onClick={p.onClose}>
                            <BackIcon size={16} /> Inbox
                        </button>
                    ) : (
                        <span className="uam-overline">Request detail</span>
                    )}
                    {breakpoint === "desktop" && (
                        <button type="button" className="uam-icon-btn" onClick={p.onClose} aria-label="Close detail">
                            <CloseIcon size={18} />
                        </button>
                    )}
                </div>

                <div className="uam-detail__title-row">
                    <Avatar name={r.submittedBy} />
                    <div className="uam-detail__titles">
                        <h2 className="uam-detail__title">{r.campaign || r.requestId}</h2>
                        <div className="uam-detail__chips">
                            <TypeChip type={r.requestType} />
                            {p.requestBusy ? (
                                <span className="uam-badge uam-badge--neutral">
                                    <SpinnerIcon size={12} className="uam-spin" /> Updating
                                </span>
                            ) : (
                                <Badge tone={toneFor(r.status)} label={r.status || "—"} dot />
                            )}
                        </div>
                    </div>
                </div>

                <dl className="uam-facts">
                    <div className="uam-facts__cell">
                        <dt>Request ID</dt>
                        <dd className="uam-mono">{r.requestId}</dd>
                    </div>
                    <div className="uam-facts__cell">
                        <dt>Period</dt>
                        <dd>
                            {period(r.requestedStartDate, r.requestedEndDate)}
                            {n ? <span className="uam-muted"> · {plural(n, "day")}</span> : null}
                        </dd>
                    </div>
                    <div className="uam-facts__cell">
                        <dt>Submitted by</dt>
                        <dd>{displayName(r.submittedBy) || "—"}</dd>
                    </div>
                    <div className="uam-facts__cell">
                        <dt>Approver</dt>
                        <dd title={r.approver}>{r.approver ? r.approver.split(/[;,]/).map((a) => displayName(a)).filter(Boolean).join(", ") : "—"}</dd>
                    </div>
                </dl>

                {stats.total > 0 && (
                    <div className="uam-progress">
                        <div className="uam-progress__text">
                            <strong>
                                {decided} of {plural(stats.total, "item")} decided
                            </strong>
                            <span className="uam-progress__legend">
                                {stats.approved > 0 && <span className="uam-legend uam-legend--approved">{stats.approved} approved</span>}
                                {stats.changed > 0 && <span className="uam-legend uam-legend--changed">{stats.changed} with changes</span>}
                                {stats.rejected > 0 && <span className="uam-legend uam-legend--rejected">{stats.rejected} rejected</span>}
                                {stats.pending > 0 && <span className="uam-legend uam-legend--pending">{stats.pending} pending</span>}
                            </span>
                        </div>
                        <DecisionBar approved={stats.approved} changed={stats.changed} rejected={stats.rejected} total={stats.total} />
                    </div>
                )}

                <p className="uam-hint">
                    <InfoIcon size={14} />
                    {p.requestLevel
                        ? "Decide the whole request below, or decide items one by one. Either way the ticket lands on the same status."
                        : "Decided item by item. Once every item is decided the ticket rolls up to Approved, Partial Approve or Rejected."}
                </p>
            </div>

            <div className="uam-tabs uam-tabs--detail" role="tablist">
                {tabs.map(([key, label, icon, count]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        className={cx("uam-tabs__tab", tab === key && "uam-tabs__tab--active")}
                        onClick={() => setTab(key)}
                    >
                        {icon}
                        {label}
                        <span className="uam-tabs__count">{count}</span>
                    </button>
                ))}
            </div>

            <div className="uam-detail__body">
                {tab === "items" && (
                    <ItemsPanel
                        items={items.rows}
                        loading={items.loading}
                        error={items.error}
                        actions={p.itemActions}
                        breakpoint={breakpoint}
                        inflight={p.inflightItems}
                        disabled={p.disabled || p.requestBusy}
                        resetKey={p.resetKey}
                        onSelectionChange={p.onItemSelectionChange}
                        onAction={p.onItemAction}
                    />
                )}
                {tab === "activity" && <Activity state={history} />}
                {tab === "comments" && <Comments state={comments} />}
            </div>

            {p.requestLevel && p.requestActions.length > 0 && (
                <div className="uam-decide">
                    <div className="uam-decide__text">
                        <strong>Whole request</strong>
                        <span className="uam-muted">
                            {isDecidedRequestStatus(r.status)
                                ? `Currently ${r.status}. Deciding again marks the ticket as revised.`
                                : stats.total > 0
                                  ? `Applies to all ${plural(stats.total, "item")} and their bookings.`
                                  : "Applies to the request and its bookings."}
                        </span>
                    </div>
                    <div className="uam-decide__actions">
                        {p.requestActions
                            .slice()
                            .sort((a, b) => weight(a) - weight(b))
                            .map((a) => (
                                <Button
                                    key={a.key}
                                    variant={isApproveLike(a) ? "primary" : isDestructive(a) ? "danger-ghost" : "outline"}
                                    icon={isApproveLike(a) ? <CheckIcon size={16} /> : isDestructive(a) ? <XCircleIcon size={16} /> : undefined}
                                    disabled={p.disabled || p.requestBusy}
                                    busy={p.requestBusy && isApproveLike(a)}
                                    onClick={() => p.onRequestAction(a)}
                                >
                                    {isApproveLike(a) ? `${a.label} request` : a.label}
                                </Button>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/** reject and revision on the left, approve last (right-most, primary) */
const weight = (a: ApprovalAction): number => (isApproveLike(a) ? 2 : isDestructive(a) ? 0 : 1);

const Activity: React.FC<{ state: DatasetState<HistoryEntry> }> = ({ state }) => {
    if (state.loading && state.rows.length === 0) return <Skeleton rows={3} />;
    if (state.error) return <ErrorState title="Unable to load activity" message={state.error} />;
    if (state.rows.length === 0) return <EmptyState icon={<HistoryIcon size={28} />} title="No activity yet" subtitle="Every decision on this request is logged here." />;
    const rows = state.rows.slice().sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return (
        <ol className="uam-timeline">
            {rows.map((h) => (
                <li key={h.historyId} className={cx("uam-timeline__entry", `uam-timeline__entry--${toneForActionLabel(h.actionLabel)}`)}>
                    <span className="uam-timeline__dot" />
                    <div className="uam-timeline__body">
                        <div className="uam-timeline__top">
                            <span className="uam-timeline__label">{h.actionLabel || "Action"}</span>
                            <span className="uam-timeline__time" title={dateTime(h.timestamp)}>
                                {relative(h.timestamp) || "—"}
                            </span>
                        </div>
                        <div className="uam-timeline__actor">{displayName(h.actor) || "—"}</div>
                        {h.comment && <blockquote className="uam-timeline__comment">{h.comment}</blockquote>}
                    </div>
                </li>
            ))}
        </ol>
    );
};

const Comments: React.FC<{ state: DatasetState<CommentEntry> }> = ({ state }) => {
    if (state.loading && state.rows.length === 0) return <Skeleton rows={3} />;
    if (state.error) return <ErrorState title="Unable to load comments" message={state.error} />;
    if (state.rows.length === 0)
        return <EmptyState icon={<MessageIcon size={28} />} title="No comments yet" subtitle="A note typed with a decision shows up here as a thread." />;
    const rows = state.rows.slice().sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return (
        <ul className="uam-thread">
            {rows.map((c) => (
                <li key={c.commentId} className="uam-thread__msg">
                    <Avatar name={c.author} size="sm" />
                    <div className="uam-thread__bubble">
                        <div className="uam-thread__top">
                            <span className="uam-thread__author">{displayName(c.author) || "—"}</span>
                            <span className="uam-thread__time" title={dateTime(c.timestamp)}>
                                {relative(c.timestamp)}
                            </span>
                        </div>
                        <p className="uam-thread__text">{c.text}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
};
