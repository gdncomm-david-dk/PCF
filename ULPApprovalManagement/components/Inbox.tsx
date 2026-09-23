import * as React from "react";
import { ApprovalItem, ApprovalRequest, Breakpoint, ControlConfig } from "../lib/types";
import { isDecidedRequestStatus, isFinalItemStatus, isRejected, toneFor } from "../lib/actions";
import { displayName, isoDay, period } from "../lib/format";
import { Avatar, Badge, Button, cx, DecisionBar, EmptyState, ErrorState, Skeleton, TypeChip } from "./Primitives";
import { CloseIcon, FilterIcon, RefreshIcon, SearchIcon } from "./Icons";

export type InboxTab = "open" | "decided" | "all";

interface Filters {
    types: string[];
    approver: string;
    from: string;
    to: string;
}
const NO_FILTERS: Filters = { types: [], approver: "", from: "", to: "" };

function useDebounced<T>(value: T, ms = 250): T {
    const [v, setV] = React.useState(value);
    React.useEffect(() => {
        const t = window.setTimeout(() => setV(value), ms);
        return () => window.clearTimeout(t);
    }, [value, ms]);
    return v;
}

const toggle = (list: string[], v: string): string[] => (list.indexOf(v) === -1 ? [...list, v] : list.filter((x) => x !== v));

export interface InboxProps {
    config: ControlConfig;
    breakpoint: Breakpoint;
    requests: ApprovalRequest[];
    loading: boolean;
    error: string | null;
    hasMore: boolean;
    onLoadMore: () => void;
    allItems: ApprovalItem[];
    openRequestId: string;
    onOpen: (id: string) => void;
    onRefresh: () => void;
    refreshing: boolean;
}

export const Inbox: React.FC<InboxProps> = (props) => {
    const { config, requests, loading, error, openRequestId, onOpen, breakpoint } = props;
    const [tab, setTab] = React.useState<InboxTab>("open");
    const [search, setSearch] = React.useState("");
    const [filters, setFilters] = React.useState<Filters>(NO_FILTERS);
    const [filterOpen, setFilterOpen] = React.useState(false);
    const term = useDebounced(search.trim().toLowerCase());

    const types = React.useMemo(() => Array.from(new Set(requests.map((r) => r.requestType).filter((t): t is string => !!t))), [requests]);
    const approvers = React.useMemo(
        () => Array.from(new Set(requests.map((r) => r.approver).filter((t): t is string => !!t))),
        [requests]
    );
    const filterCount = filters.types.length + (filters.approver ? 1 : 0) + (filters.from || filters.to ? 1 : 0);

    const counts = React.useMemo(() => {
        const decided = requests.filter((r) => isDecidedRequestStatus(r.status)).length;
        return { open: requests.length - decided, decided, all: requests.length };
    }, [requests]);

    const kpis = React.useMemo(() => {
        const c = { waiting: 0, approved: 0, partial: 0, rejected: 0 };
        requests.forEach((r) => {
            const s = r.status.trim().toLowerCase();
            if (!isDecidedRequestStatus(r.status)) c.waiting++;
            else if (s === "partial approve") c.partial++;
            else if (isRejected(r.status)) c.rejected++;
            else if (s !== "revision required") c.approved++;
        });
        return c;
    }, [requests]);

    // item progress per request, when the items dataset carries more than the open request
    const progress = React.useMemo(() => {
        const m = new Map<string, { total: number; approved: number; changed: number; rejected: number }>();
        props.allItems.forEach((i) => {
            const k = i.requestId.trim().toLowerCase();
            if (!k) return;
            const e = m.get(k) ?? { total: 0, approved: 0, changed: 0, rejected: 0 };
            e.total++;
            const s = i.status.trim().toLowerCase();
            if (s === "rejected") e.rejected++;
            else if (s === "approved with changes") e.changed++;
            else if (isFinalItemStatus(i.status)) e.approved++;
            m.set(k, e);
        });
        return m;
    }, [props.allItems]);

    const visible = React.useMemo(() => {
        const inTab = (r: ApprovalRequest): boolean =>
            tab === "all" ? true : tab === "decided" ? isDecidedRequestStatus(r.status) : !isDecidedRequestStatus(r.status);
        const inSearch = (r: ApprovalRequest): boolean =>
            term.length === 0 || `${r.requestId} ${r.campaign} ${r.submittedBy ?? ""} ${r.requestType ?? ""}`.toLowerCase().indexOf(term) !== -1;
        const inFilters = (r: ApprovalRequest): boolean => {
            if (filters.types.length > 0 && filters.types.indexOf(r.requestType ?? "") === -1) return false;
            if (filters.approver && (r.approver ?? "").toLowerCase().indexOf(filters.approver.toLowerCase()) === -1) return false;
            if (filters.from && r.requestedEndDate && isoDay(r.requestedEndDate) < filters.from) return false;
            if (filters.to && r.requestedStartDate && isoDay(r.requestedStartDate) > filters.to) return false;
            return true;
        };
        const rank = (r: ApprovalRequest): number => (isDecidedRequestStatus(r.status) ? 1 : 0);
        const when = (r: ApprovalRequest): number => r.requestedStartDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return requests
            .filter((r) => inTab(r) && inSearch(r) && inFilters(r))
            .sort((a, b) => rank(a) - rank(b) || when(a) - when(b));
    }, [requests, tab, term, filters]);

    const searching = term.length > 0 || filterCount > 0;

    return (
        <div className="uam-inbox">
            <div className="uam-inbox__head">
                <div className="uam-inbox__titles">
                    <h1 className="uam-inbox__title">{config.title}</h1>
                    <p className="uam-inbox__subtitle">{config.subtitle}</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<RefreshIcon size={14} className={props.refreshing ? "uam-spin" : undefined} />}
                    onClick={props.onRefresh}
                    aria-label="Refresh"
                >
                    {breakpoint === "desktop" ? "Refresh" : null}
                </Button>
            </div>

            {config.showSummaryCards && (
                <div className="uam-kpis">
                    <Kpi label="Waiting" value={kpis.waiting} tone="warning" />
                    <Kpi label="Approved" value={kpis.approved} tone="success" />
                    <Kpi label="Partial" value={kpis.partial} tone="brand" />
                    <Kpi label="Rejected" value={kpis.rejected} tone="danger" />
                </div>
            )}

            {(config.showSearch || config.showFilter) && (
                <div className="uam-toolbar">
                    {config.showSearch && (
                        <div className="uam-search">
                            <SearchIcon size={16} className="uam-search__icon" />
                            <input
                                type="text"
                                className="uam-search__input"
                                placeholder="Search ID, campaign, requester"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                aria-label="Search approvals"
                            />
                            {search && (
                                <button type="button" className="uam-search__clear" onClick={() => setSearch("")} aria-label="Clear search">
                                    <CloseIcon size={14} />
                                </button>
                            )}
                        </div>
                    )}
                    {config.showFilter && (
                        <button
                            type="button"
                            className={cx("uam-filter-btn", (filterOpen || filterCount > 0) && "uam-filter-btn--active")}
                            onClick={() => setFilterOpen((o) => !o)}
                            aria-expanded={filterOpen}
                        >
                            <FilterIcon size={14} />
                            Filter
                            {filterCount > 0 && <span className="uam-count">{filterCount}</span>}
                        </button>
                    )}
                </div>
            )}

            {filterOpen && (
                <div className="uam-filter-panel">
                    {types.length > 0 && (
                        <div className="uam-filter-panel__group">
                            <span className="uam-overline">Request type</span>
                            <div className="uam-chips">
                                {types.map((t) => (
                                    <button
                                        type="button"
                                        key={t}
                                        className={cx("uam-chip", filters.types.indexOf(t) !== -1 && "uam-chip--active")}
                                        onClick={() => setFilters((f) => ({ ...f, types: toggle(f.types, t) }))}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {approvers.length > 0 && (
                        <div className="uam-filter-panel__group">
                            <span className="uam-overline">Approver</span>
                            <input
                                className="uam-input"
                                placeholder="Name or email"
                                value={filters.approver}
                                onChange={(e) => setFilters((f) => ({ ...f, approver: e.target.value }))}
                            />
                        </div>
                    )}
                    <div className="uam-filter-panel__group">
                        <span className="uam-overline">Period overlaps</span>
                        <div className="uam-date-row">
                            <input type="date" className="uam-input" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} aria-label="From" />
                            <input type="date" className="uam-input" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} aria-label="To" />
                        </div>
                    </div>
                    <div className="uam-filter-panel__foot">
                        <Button variant="ghost" size="sm" onClick={() => setFilters(NO_FILTERS)} disabled={filterCount === 0}>
                            Reset
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => setFilterOpen(false)}>
                            Done
                        </Button>
                    </div>
                </div>
            )}

            <div className="uam-tabs" role="tablist">
                {(
                    [
                        ["open", "Needs action", counts.open],
                        ["decided", "Decided", counts.decided],
                        ["all", "All", counts.all]
                    ] as [InboxTab, string, number][]
                ).map(([key, label, n]) => (
                    <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        className={cx("uam-tabs__tab", tab === key && "uam-tabs__tab--active")}
                        onClick={() => setTab(key)}
                    >
                        {label}
                        <span className="uam-tabs__count">{n}</span>
                    </button>
                ))}
            </div>

            <div className="uam-inbox__list">
                {error ? (
                    <ErrorState message={error} />
                ) : loading && requests.length === 0 ? (
                    <Skeleton rows={5} />
                ) : requests.length === 0 ? (
                    <EmptyState title={config.emptyStateTitle} subtitle={config.emptyStateSubtitle} />
                ) : visible.length === 0 ? (
                    searching ? (
                        <EmptyState
                            icon={<SearchIcon size={28} />}
                            title="No matching requests"
                            subtitle="Try another search or clear the filters."
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearch("");
                                        setFilters(NO_FILTERS);
                                    }}
                                >
                                    Clear search and filters
                                </Button>
                            }
                        />
                    ) : tab === "open" ? (
                        <EmptyState title="Nothing waiting on you" subtitle="Every request here has been decided." />
                    ) : (
                        <EmptyState title="No requests in this view" />
                    )
                ) : (
                    <ul className="uam-cards">
                        {visible.map((r) => (
                            <RequestCard
                                key={r.requestId}
                                request={r}
                                active={r.requestId === openRequestId}
                                progress={progress.get(r.requestId.trim().toLowerCase())}
                                onOpen={() => onOpen(r.requestId)}
                            />
                        ))}
                        {props.hasMore && (
                            <li className="uam-cards__more">
                                <Button variant="outline" size="sm" onClick={props.onLoadMore}>
                                    Load more
                                </Button>
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};

const Kpi: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
    <div className={cx("uam-kpi", `uam-kpi--${tone}`)}>
        <span className="uam-kpi__label">{label}</span>
        <span className="uam-kpi__value">{value}</span>
    </div>
);

const RequestCard: React.FC<{
    request: ApprovalRequest;
    active: boolean;
    progress?: { total: number; approved: number; changed: number; rejected: number };
    onOpen: () => void;
}> = ({ request: r, active, progress, onOpen }) => {
    const decided = progress ? progress.approved + progress.changed + progress.rejected : 0;
    return (
        <li>
            <button type="button" className={cx("uam-card", active && "uam-card--active")} onClick={onOpen} aria-current={active}>
                <Avatar name={r.submittedBy} />
                <span className="uam-card__main">
                    <span className="uam-card__row">
                        <span className="uam-card__title">{r.campaign || r.requestId}</span>
                        <Badge tone={toneFor(r.status)} label={r.status || "—"} />
                    </span>
                    <span className="uam-card__row uam-card__row--meta">
                        <TypeChip type={r.requestType} />
                        <span className="uam-card__meta">
                            {r.requestId}
                            {r.submittedBy ? ` · ${displayName(r.submittedBy)}` : ""}
                        </span>
                    </span>
                    <span className="uam-card__row uam-card__row--meta">
                        <span className="uam-card__period">{period(r.requestedStartDate, r.requestedEndDate)}</span>
                        {progress && progress.total > 0 && (
                            <span className="uam-card__progress">
                                <DecisionBar {...progress} />
                                <span>
                                    {decided}/{progress.total}
                                </span>
                            </span>
                        )}
                    </span>
                </span>
            </button>
        </li>
    );
};
