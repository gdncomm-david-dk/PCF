import * as React from "react";
import { buildIndex, consumes, makeRule, passesInclude, summarize, validate } from "../lib/capacity";
import { addDays, addMonths, dayCount, dayRange, endOfMonth, period, rangeTitle, startOfMonth, startOfWeek, todayKey } from "../lib/dates";
import { guardSelection } from "../lib/copy";
import { isConfirmed, overlay, PendingChange, unchanged } from "../lib/pending";
import { isMasked, personName } from "../lib/present";
import { Booking, CalendarConfig, CalendarEvent, DataState, Placement, ViewKind } from "../lib/types";
import { Agenda } from "./Agenda";
import { BookingDialog, ConfirmDialog } from "./BookingDialog";
import { CapacityGrid } from "./CapacityGrid";
import { DayPanel } from "./DayPanel";
import { ListView } from "./ListView";
import { Cell, DragApi, ViewModel } from "./model";
import { Timeline } from "./Timeline";
import { AlertIcon, Badge, Button, ChevronLeft, ChevronRight, CloseIcon, IconButton, PlusIcon, SearchIcon, Segmented, ToastMsg, Toasts } from "./ui";
import { WeekBoard } from "./WeekBoard";

interface Props {
    data: DataState;
    config: CalendarConfig;
    onEvent: (e: CalendarEvent) => void;
}

type Span = "2w" | "month";
type Scope = "all" | "scarce";
interface DialogState {
    initial: Booking;
    isEdit: boolean;
}

const VIEWS: { value: ViewKind; label: string }[] = [
    { value: "Month", label: "Capacity" },
    { value: "Week", label: "Week" },
    { value: "Timeline", label: "Timeline" },
    { value: "List", label: "List" }
];
const PHONE_VIEWS: { value: ViewKind; label: string }[] = [
    { value: "Month", label: "Capacity" },
    { value: "List", label: "List" }
];
const FALLBACK_STATUSES = ["Confirmed", "Pending", "Draft", "Cancelled"];
const PHONE = 700;
const SIDE_PANEL = 1100;
const CONFIRM_MS = 30000;

export const App: React.FC<Props> = ({ data, config, onEvent }) => {
    const phone = config.width < PHONE;
    const sidePanel = config.width >= SIDE_PANEL;
    const rule = React.useMemo(() => makeRule(config.capacityStatuses), [config.capacityStatuses.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

    const [view, setView] = React.useState<ViewKind>(config.defaultView);
    const [span, setSpan] = React.useState<Span>("2w");
    const [anchor, setAnchor] = React.useState(config.focusDateKey);
    const [search, setSearch] = React.useState("");
    const [scope, setScope] = React.useState<Scope>("all");
    const [selected, setSelected] = React.useState<Cell | null>(null);
    const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
    const [dialog, setDialog] = React.useState<DialogState | null>(null);
    const [confirmId, setConfirmId] = React.useState<string | null>(null);
    const [toasts, setToasts] = React.useState<ToastMsg[]>([]);
    const [dragId, setDragId] = React.useState<string | null>(null);
    const [phoneDay, setPhoneDay] = React.useState<string | null>(null);
    // a toast with a key replaces the one with the same key (Saving… → Saved / Not saved)
    const toast = React.useCallback((t: Omit<ToastMsg, "id"> & { ttl?: number }) => {
        const id = Date.now() + Math.random();
        const { ttl, ...msg } = t;
        setToasts((xs) => {
            const at = msg.key ? xs.findIndex((x) => x.key === msg.key) : -1;
            if (at !== -1) return xs.map((x, i) => (i === at ? { ...msg, id } : x));
            return [...xs.slice(-2), { ...msg, id }];
        });
        window.setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), ttl ?? (t.tone === "bad" ? 9000 : 4000));
    }, []);

    const rootRef = React.useRef<HTMLDivElement>(null);
    // the canvas player blocks text selection and copy; keep its handlers out of the control
    React.useEffect(() => (rootRef.current ? guardSelection(rootRef.current) : undefined), []);

    // Optimistic changes: a create / edit / move / delete shows at once, laid over the app's data,
    // until the app's data carries it (Saved) or CONFIRM_MS pass without it (Not saved: the app
    // refused it, e.g. a Patch failed or the slot was taken meanwhile).
    const [pending, setPending] = React.useState<PendingChange[]>([]);
    const local = React.useMemo(() => (pending.length === 0 ? data.bookings : overlay(data.bookings, pending)), [data.bookings, pending]);
    const savingIds = React.useMemo(() => new Set(pending.map((p) => p.id)), [pending]);
    const pendingRef = React.useRef(pending);
    pendingRef.current = pending;

    const track = (p: Omit<PendingChange, "at" | "known">) => {
        const change: PendingChange = { ...p, at: Date.now(), known: p.kind === "create" ? new Set(data.bookings.map((b) => b.id)) : undefined };
        const name = p.booking.campaignName || "Booking";
        // the app's data already looks like this (only fields it does not send changed): nothing to wait for
        if (p.kind === "update" && data.bookings.some((b) => b.id === p.id) && isConfirmed(change, data.bookings)) {
            toast({ key: `save:${p.id}`, tone: "ok", title: "Changes sent", body: `${name} · sent to the app.` });
            return;
        }
        setPending((ps) => [...ps.filter((x) => x.id !== p.id), change]);
        const title = p.kind === "create" ? "Saving new booking…" : p.kind === "delete" ? "Deleting booking…" : p.label === "moved" ? "Moving booking…" : "Saving changes…";
        toast({ key: `save:${p.id}`, tone: "info", busy: true, title, body: `${name} · waiting for the app to confirm`, ttl: CONFIRM_MS + 2000 });
    };

    React.useEffect(() => {
        const ps = pendingRef.current;
        if (ps.length === 0) return;
        const done = ps.filter((p) => isConfirmed(p, data.bookings));
        if (done.length === 0) return;
        setPending((xs) => xs.filter((x) => !done.includes(x)));
        done.forEach((p) => {
            const name = p.booking.campaignName || "The booking";
            const place = data.placements.find((x) => x.id === p.booking.placementId)?.name ?? p.booking.placementId;
            const title = p.kind === "create" ? "Booking created" : p.kind === "delete" ? "Booking deleted" : p.label === "moved" ? "Booking moved" : "Changes saved";
            const body = p.kind === "delete" ? `${name} released its slot.` : `${name} · ${place}, ${period(p.booking.startDate, p.booking.endDate)}`;
            toast({ key: `save:${p.id}`, tone: "ok", title, body });
        });
    }, [data.signature]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => {
        if (pending.length === 0) return;
        const oldest = Math.min(...pending.map((p) => p.at));
        const timer = window.setTimeout(() => {
            const now = Date.now();
            const expired = pendingRef.current.filter((p) => now - p.at >= CONFIRM_MS);
            if (expired.length === 0) return;
            setPending((xs) => xs.filter((x) => !expired.includes(x)));
            expired.forEach((p) =>
                toast({
                    key: `save:${p.id}`,
                    tone: "bad",
                    title: "Not saved",
                    body: `${p.booking.campaignName || "The change"}: the app did not confirm it within ${CONFIRM_MS / 1000} seconds, so the calendar shows the saved bookings again. Check the app's message for the reason.`
                })
            );
        }, Math.max(0, oldest + CONFIRM_MS - Date.now()));
        return () => window.clearTimeout(timer);
    }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps

    React.useEffect(() => setAnchor(config.focusDateKey), [config.focusDateKey]);
    React.useEffect(() => setView(config.defaultView), [config.defaultView]);


    // ---------- period ----------
    const activeView: ViewKind = phone && view !== "List" ? "Month" : view;
    const [first, last] = React.useMemo((): [string, string] => {
        if (phone || activeView === "Week") {
            const s = startOfWeek(anchor, config.weekStartsOn);
            return [s, addDays(s, 6)];
        }
        if (span === "month") return [startOfMonth(anchor), endOfMonth(anchor)];
        const s = startOfWeek(anchor, config.weekStartsOn);
        return [s, addDays(s, 13)];
    }, [phone, activeView, span, anchor, config.weekStartsOn]);
    const days = React.useMemo(() => dayRange(first, last), [first, last]);
    const step = (dir: number) => setAnchor((a) => (phone || activeView === "Week" ? addDays(a, 7 * dir) : span === "month" ? addMonths(a, dir) : addDays(a, 14 * dir)));

    // ---------- data ----------
    const bookings = React.useMemo(() => local.filter((b) => passesInclude(b, config.includeStatuses)), [local, config.includeStatuses]);
    const index = React.useMemo(() => buildIndex(bookings, rule), [bookings, rule]);
    const placementsById = React.useMemo(() => new Map(data.placements.map((p) => [p.id, p] as [string, Placement])), [data.placements]);
    const bookingsById = React.useMemo(() => new Map(bookings.map((b) => [b.id, b] as [string, Booking])), [bookings]);

    const q = search.trim().toLowerCase();
    const { shownPlacements, shownBookings } = React.useMemo(() => {
        const nameHit = (p: Placement | undefined) => !!p && p.name.toLowerCase().includes(q);
        const bookingHit = (b: Booking) =>
            !isMasked(b, config) && [b.campaignName, b.requester, personName(b.requester), b.status].some((v) => (v ?? "").toLowerCase().includes(q));
        const list = q === "" ? bookings : bookings.filter((b) => nameHit(placementsById.get(b.placementId)) || bookingHit(b));
        const withHits = new Set(list.filter((b) => b.startDate <= last && b.endDate >= first).map((b) => b.placementId));
        const ps = data.placements.filter((p) => (scope === "scarce" ? p.dailyCapacity <= 1 : true) && (q === "" || nameHit(p) || withHits.has(p.id)));
        return { shownPlacements: ps, shownBookings: list };
    }, [bookings, data.placements, placementsById, q, scope, first, last, config]);

    const summary = React.useMemo(() => summarize(index, shownPlacements, days), [index, shownPlacements, days]);
    const statuses = React.useMemo(() => {
        const seen = new Map<string, string>();
        [...config.includeStatuses, ...config.capacityStatuses, ...local.map((b) => b.status ?? "")].forEach((s) => {
            const t = s.trim();
            if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
        });
        return seen.size > 0 ? [...seen.values()] : FALLBACK_STATUSES;
    }, [local, config.includeStatuses, config.capacityStatuses]);

    // ---------- interaction ----------
    const selectCell = React.useCallback(
        (placementId: string, day: string) => {
            setSelected({ placementId, day });
            setSelectedBookingId(null);
            onEvent({ action: "DateSelected", placementId, dateKey: day });
        },
        [onEvent]
    );

    const selectBooking = React.useCallback(
        (id: string) => {
            const b = bookingsById.get(id);
            if (!b) return;
            const day = b.startDate < first && b.endDate >= first ? first : b.startDate;
            setSelected({ placementId: b.placementId, day });
            setSelectedBookingId(id);
            onEvent({ action: "BookingSelected", bookingId: b.id, placementId: b.placementId, dateKey: b.startDate, booking: b });
        },
        [bookingsById, first, onEvent]
    );

    const defaultStatus = config.includeStatuses[0] ?? config.capacityStatuses[0] ?? (statuses.find((s) => /^confirmed$/i.test(s)) || statuses[0]);
    const openCreate = React.useCallback(
        (placementId: string, day: string) =>
            setDialog({
                isEdit: false,
                initial: { id: "", campaignName: "", placementId, startDate: day, endDate: day, startTime: "00:00", endTime: "23:59", requester: config.currentUser || undefined, status: defaultStatus, notes: "" }
            }),
        [config.currentUser, defaultStatus]
    );
    // a booking whose last change is still unconfirmed cannot be changed again: the app may not know its id yet
    const stillSaving = (id: string): boolean => {
        if (!savingIds.has(id)) return false;
        toast({ key: `busy:${id}`, tone: "info", title: "Still saving", body: "Wait until the app confirms the last change to this booking, then try again." });
        return true;
    };
    const openEdit = (id: string) => {
        const b = bookingsById.get(id);
        if (b && !isMasked(b, config) && !stillSaving(id)) setDialog({ isEdit: true, initial: { ...b } });
    };
    const askDelete = (id: string) => !stillSaving(id) && setConfirmId(id);

    const hiddenNotice = (b: Booking) => {
        if (passesInclude(b, config.includeStatuses)) return;
        toast({
            tone: "info",
            title: "Saved, but hidden here",
            body: `This calendar shows only ${config.includeStatuses.join(", ")} bookings, so ${b.campaignName || "this booking"} is no longer listed.`
        });
    };

    const save = (b: Booking) => {
        if (dialog?.isEdit) {
            const previous = local.find((x) => x.id === b.id);
            if (previous && unchanged(previous, b)) {
                setDialog(null);
                toast({ tone: "info", title: "No changes", body: "Nothing was changed, so nothing was sent." });
                return;
            }
            track({ id: b.id, kind: "update", booking: b });
            onEvent({ action: "BookingUpdated", bookingId: b.id, placementId: b.placementId, dateKey: b.startDate, booking: b, previous });
        } else {
            const created = { ...b, id: `new-${todayKey()}-${Math.random().toString(36).slice(2, 10)}` };
            track({ id: created.id, kind: "create", booking: created });
            onEvent({ action: "BookingCreated", bookingId: created.id, placementId: created.placementId, dateKey: created.startDate, booking: created });
            setSelectedBookingId(created.id);
        }
        hiddenNotice(b);
        setSelected({ placementId: b.placementId, day: b.startDate });
        setDialog(null);
    };

    const remove = (id: string) => {
        const b = local.find((x) => x.id === id);
        setConfirmId(null);
        if (!b) return;
        track({ id, kind: "delete", booking: b });
        if (selectedBookingId === id) setSelectedBookingId(null);
        onEvent({ action: "BookingDeleted", bookingId: id, placementId: b.placementId, dateKey: b.startDate, booking: b });
    };

    const canMoveBookings = config.allowDragDrop && config.allowEdit;
    const moveCheck = React.useCallback(
        (b: Booking, placementId: string, day: string) => {
            const target = placementsById.get(placementId);
            if (!target) return { ok: false, message: "The target placement no longer exists." };
            if (!consumes(b, rule)) return { ok: true };
            return validate(index, target, day, addDays(day, dayCount(b.startDate, b.endDate) - 1), b.id);
        },
        [placementsById, rule, index]
    );
    const drag: DragApi = {
        draggingId: dragId,
        start: setDragId,
        end: () => setDragId(null),
        check: (placementId, day) => {
            const b = dragId ? bookingsById.get(dragId) : undefined;
            return b ? moveCheck(b, placementId, day).ok : null;
        },
        drop: (placementId, day) => {
            const b = dragId ? bookingsById.get(dragId) : undefined;
            setDragId(null);
            if (!b || (b.placementId === placementId && b.startDate === day) || stillSaving(b.id)) return;
            const res = moveCheck(b, placementId, day);
            if (!res.ok) {
                toast({ tone: "bad", title: "Cannot move booking", body: res.message });
                return;
            }
            const moved: Booking = { ...b, placementId, startDate: day, endDate: addDays(day, dayCount(b.startDate, b.endDate) - 1) };
            track({ id: b.id, kind: "update", booking: moved, label: "moved" });
            onEvent({ action: "BookingUpdated", bookingId: moved.id, placementId, dateKey: day, booking: moved, previous: b });
            setSelected({ placementId, day });
            setSelectedBookingId(b.id);
            hiddenNotice(moved);
        }
    };

    const vm: ViewModel = {
        config,
        rule,
        index,
        placements: shownPlacements,
        placementsById,
        bookings: shownBookings,
        bookingsById,
        days,
        today: todayKey(),
        selected,
        selectedBookingId,
        savingIds,
        canMoveBookings,
        onSelectCell: selectCell,
        onSelectBooking: selectBooking,
        onCreate: openCreate,
        onEdit: openEdit,
        onDelete: askDelete,
        drag
    };

    const agendaDay = phoneDay && days.includes(phoneDay) ? phoneDay : days.includes(vm.today) ? vm.today : days[0];
    const jump = (day: string) => {
        if (!selected) return;
        if (day < first || day > last) setAnchor(day);
        selectCell(selected.placementId, day);
    };
    const closePanel = () => {
        setSelected(null);
        setSelectedBookingId(null);
    };

    // ---------- render ----------
    const explicitError = data.errorMessage;
    let body: React.ReactNode;
    if (data.isLoading) body = <Skeleton rows={6} cols={phone ? 3 : 14} />;
    else if (explicitError) body = <ErrorState message={explicitError} />;
    else if (data.placements.length === 0)
        body = <EmptyState title="No placements to show" text={data.parseError ?? "Bind the Placements dataset or the Placements JSON property to fill the calendar."} />;
    else if (shownPlacements.length === 0)
        body = (
            <EmptyState title="Nothing matches" text="No placement or campaign matches the search and scope.">
                <Button variant="outline" size="sm" onClick={() => (setSearch(""), setScope("all"))}>
                    Clear filters
                </Button>
            </EmptyState>
        );
    else if (phone) body = activeView === "List" ? <ListView vm={vm} compact /> : <Agenda vm={vm} day={agendaDay} onDay={setPhoneDay} />;
    else if (activeView === "Week") body = <WeekBoard vm={vm} />;
    else if (activeView === "Timeline") body = <Timeline vm={vm} />;
    else if (activeView === "List") body = <ListView vm={vm} compact={config.width < 900} />;
    else body = <CapacityGrid vm={vm} />;

    const panelPlacement = selected ? placementsById.get(selected.placementId) : undefined;
    const showSide = sidePanel && !data.isLoading && !explicitError && data.placements.length > 0 && activeView !== "List";
    const showSheet = !sidePanel && !!panelPlacement;

    return (
        <div ref={rootRef} className={`msc-root${phone ? " is-phone" : ""}${sidePanel ? " is-wide" : ""}`} onKeyDown={(e) => e.key === "Escape" && !dialog && !confirmId && closePanel()}>
            <header className="msc-header">
                <div className="msc-header__text">
                    <h1>{config.headerTitle}</h1>
                    <p>
                        {config.headerSubtitle}
                        {data.mode === "Mock" && (
                            <Badge tone="info" title="Nothing is bound yet, so the calendar shows built-in sample data.">
                                Sample data
                            </Badge>
                        )}
                    </p>
                </div>
                {config.allowCreate && data.placements.length > 0 && (
                    <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => openCreate(selected?.placementId || shownPlacements[0]?.id || data.placements[0].id, selected?.day ?? (days.includes(vm.today) ? vm.today : first))}>
                        {phone ? "Add" : "Add booking"}
                    </Button>
                )}
            </header>

            {data.parseError && !explicitError && (
                <div className="msc-banner" role="alert">
                    <AlertIcon size={16} />
                    <span>{data.parseError}</span>
                </div>
            )}

            {config.kpiDensity !== "Hidden" && !data.isLoading && !explicitError && data.placements.length > 0 && (
                <div className={`msc-kpis msc-kpis--${config.kpiDensity === "Comfortable" ? "comfy" : "compact"}`} aria-label="Capacity summary">
                    <Kpi label="Utilisation" value={`${summary.utilization}%`} hint={`${summary.booked} of ${summary.totalSlots} slot-days`} meter={summary.utilization} />
                    <Kpi label="Free slots" value={String(summary.available)} hint={rangeTitle(first, last)} tone="ok" />
                    <Kpi label="Almost full" value={String(summary.almostFull)} hint="placement-days" tone="warn" />
                    <Kpi label="Fully booked" value={String(summary.fullyBooked)} hint="placement-days" tone="bad" />
                    {summary.pending > 0 && <Kpi label="Pending" value={String(summary.pending)} hint="not taking a slot yet" tone="info" />}
                </div>
            )}

            <div className="msc-toolbar msc-card">
                <div className="msc-nav">
                    <IconButton label="Previous period" className="msc-round" onClick={() => step(-1)}>
                        <ChevronLeft size={16} />
                    </IconButton>
                    <Button size="sm" variant="ghost" onClick={() => setAnchor(todayKey())}>
                        Today
                    </Button>
                    <IconButton label="Next period" className="msc-round" onClick={() => step(1)}>
                        <ChevronRight size={16} />
                    </IconButton>
                    <span className="msc-range" aria-live="polite">
                        {rangeTitle(first, last)}
                    </span>
                </div>
                <div className="msc-tools">
                    <label className="msc-search">
                        <SearchIcon size={15} />
                        <input value={search} placeholder={phone ? "Search" : "Search placement or campaign"} aria-label="Search placement, campaign or requester" onChange={(e) => setSearch(e.target.value)} />
                        {search && (
                            <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
                                <CloseIcon size={13} />
                            </button>
                        )}
                    </label>
                    <Segmented label="Calendar view" options={phone ? PHONE_VIEWS : VIEWS} value={phone && view !== "List" ? "Month" : view} onChange={setView} />
                    {!phone && activeView !== "Week" && (
                        <Segmented
                            label="Period"
                            options={[
                                { value: "2w", label: "2 weeks" },
                                { value: "month", label: "Month" }
                            ]}
                            value={span}
                            onChange={setSpan}
                        />
                    )}
                    <Segmented
                        label="Placements"
                        options={[
                            { value: "all", label: phone ? "All" : "All placements" },
                            { value: "scarce", label: "1 slot/day" }
                        ]}
                        value={scope}
                        onChange={setScope}
                    />
                </div>
            </div>

            <div className="msc-body">
                <main className="msc-main">{body}</main>
                {showSide && <DayPanel vm={vm} placement={panelPlacement} day={selected?.day ?? null} asSheet={false} onClose={closePanel} onJump={jump} />}
            </div>

            {showSheet && <DayPanel vm={vm} placement={panelPlacement} day={selected?.day ?? null} asSheet onClose={closePanel} onJump={jump} />}

            {dialog && (
                <BookingDialog
                    initial={dialog.initial}
                    isEdit={dialog.isEdit}
                    placements={data.placements}
                    index={index}
                    rule={rule}
                    statuses={statuses}
                    onClose={() => setDialog(null)}
                    onSave={save}
                />
            )}
            {confirmId && (
                <ConfirmDialog
                    title="Delete booking?"
                    body={`${bookingsById.get(confirmId)?.campaignName ?? "This booking"} will be removed and its slot released. This cannot be undone from the calendar.`}
                    confirm="Delete"
                    onClose={() => setConfirmId(null)}
                    onConfirm={() => remove(confirmId)}
                />
            )}
            <Toasts items={toasts} onDismiss={(id) => setToasts((xs) => xs.filter((x) => x.id !== id))} />
        </div>
    );
};

const Kpi: React.FC<{ label: string; value: string; hint: string; tone?: string; meter?: number }> = ({ label, value, hint, tone, meter }) => (
    <div className={`msc-kpi${tone ? ` msc-kpi--${tone}` : ""}`}>
        <span className="msc-kpi__label">{label}</span>
        <strong className="msc-kpi__value">{value}</strong>
        <span className="msc-kpi__hint">{hint}</span>
        {meter !== undefined && (
            <span className="msc-kpi__meter">
                <span style={{ width: `${Math.min(100, meter)}%` }} />
            </span>
        )}
    </div>
);

const Skeleton: React.FC<{ rows: number; cols: number }> = ({ rows, cols }) => (
    <div className="msc-card msc-skeleton" aria-busy="true" aria-label="Loading placements and bookings">
        {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="msc-skeleton__row" style={{ gridTemplateColumns: `160px repeat(${cols}, 1fr)` }}>
                {Array.from({ length: cols + 1 }, (_, c) => (
                    <span key={c} className="msc-shimmer" />
                ))}
            </div>
        ))}
    </div>
);

const EmptyState: React.FC<{ title: string; text: string; children?: React.ReactNode }> = ({ title, text, children }) => (
    <div className="msc-card msc-empty">
        <strong>{title}</strong>
        <span>{text}</span>
        {children}
    </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
    <div className="msc-card msc-empty msc-empty--error" role="alert">
        <span className="msc-empty__icon">
            <AlertIcon size={22} />
        </span>
        <strong>The calendar could not load</strong>
        <span>{message}</span>
    </div>
);
