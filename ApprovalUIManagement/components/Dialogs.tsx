import * as React from "react";
import { ApprovalAction, ApprovalItem, Breakpoint, ItemAvailability } from "../lib/types";
import { isDestructive } from "../lib/actions";
import { isoDay, longDay, period, plural } from "../lib/format";
import { Button, cx } from "./Primitives";
import { AlertIcon, CalendarIcon, CloseIcon } from "./Icons";

interface ShellProps {
    title: string;
    subtitle?: React.ReactNode;
    breakpoint: Breakpoint;
    onClose: () => void;
    footer: React.ReactNode;
    tone?: "default" | "danger";
    children?: React.ReactNode;
}

const DialogShell: React.FC<ShellProps> = ({ title, subtitle, breakpoint, onClose, footer, tone = "default", children }) => {
    React.useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    return (
        <div className="uam-overlay" role="presentation" onMouseDown={onClose}>
            <div
                className={cx("uam-dialog", breakpoint === "mobile" && "uam-dialog--sheet", tone === "danger" && "uam-dialog--danger")}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="uam-dialog__header">
                    <div>
                        <h2 className="uam-dialog__title">{title}</h2>
                        {subtitle && <div className="uam-dialog__subtitle">{subtitle}</div>}
                    </div>
                    <button type="button" className="uam-icon-btn" onClick={onClose} aria-label="Close">
                        <CloseIcon size={18} />
                    </button>
                </div>
                <div className="uam-dialog__body">{children}</div>
                <div className="uam-dialog__footer">{footer}</div>
            </div>
        </div>
    );
};

export interface DecisionTarget {
    /** "request" = whole ticket, "item" = the listed placements */
    level: "request" | "item";
    action: ApprovalAction;
    /** display names of what is being decided */
    names: string[];
    /** extra context line, e.g. "Cascades to 3 placements and their bookings." */
    note?: string;
}

export const DecisionDialog: React.FC<{
    target: DecisionTarget;
    breakpoint: Breakpoint;
    onCancel: () => void;
    onConfirm: (comment: string) => void;
}> = ({ target, breakpoint, onCancel, onConfirm }) => {
    const [comment, setComment] = React.useState("");
    const ref = React.useRef<HTMLTextAreaElement>(null);
    React.useEffect(() => ref.current?.focus(), []);
    const { action, names, level } = target;
    const danger = isDestructive(action);
    const valid = !action.requiresComment || comment.trim().length > 0;
    const what = level === "request" ? "this request" : names.length === 1 ? names[0] : plural(names.length, "item");
    const shown = names.slice(0, 5);

    return (
        <DialogShell
            title={`${action.label} ${level === "request" ? "request" : names.length === 1 ? "item" : plural(names.length, "item")}?`}
            subtitle={level === "request" ? names[0] : undefined}
            breakpoint={breakpoint}
            onClose={onCancel}
            tone={danger ? "danger" : "default"}
            footer={
                <>
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant={danger ? "danger" : "primary"} onClick={() => onConfirm(comment.trim())} disabled={!valid}>
                        {action.label}
                    </Button>
                </>
            }
        >
            <p className="uam-dialog__text">
                You are about to <strong>{action.label.toLowerCase()}</strong> {what}. The status becomes{" "}
                <strong>{action.resultStatus}</strong>.
            </p>
            {target.note && (
                <p className="uam-callout">
                    <AlertIcon size={16} />
                    <span>{target.note}</span>
                </p>
            )}
            {level === "item" && names.length > 1 && (
                <ul className="uam-dialog__list">
                    {shown.map((n, i) => (
                        <li key={`${n}-${i}`}>{n}</li>
                    ))}
                    {names.length > shown.length && <li className="uam-muted">+{names.length - shown.length} more</li>}
                </ul>
            )}
            <label className="uam-field">
                <span className="uam-field__label">
                    {action.requiresComment ? "Reason" : "Note"}
                    {action.requiresComment ? <span className="uam-req"> *</span> : <span className="uam-muted"> (optional)</span>}
                </span>
                <textarea
                    ref={ref}
                    className="uam-input uam-input--area"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder={action.requiresComment ? "Tell the requester why" : "Visible in the Comments tab"}
                />
            </label>
        </DialogShell>
    );
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-mm-dd list from a string ("a, b; c") or an array of strings / { Value | value | date }. */
function dateList(v: unknown): string[] {
    const out: string[] = [];
    const push = (x: unknown): void => {
        if (x === null || x === undefined) return;
        const s = String(x).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s) && out.length < 2000) out.push(s.slice(0, 10));
    };
    if (typeof v === "string") v.split(/[,;|\s]+/).forEach(push);
    else if (Array.isArray(v))
        v.forEach((x) => {
            if (x && typeof x === "object") {
                const o = x as Record<string, unknown>;
                push(o.Value ?? o.value ?? o.date);
            } else push(x);
        });
    return out;
}

/** null = nothing supplied (any period allowed). Same rules as 1.6. */
export function parseAvailability(json: string): ItemAvailability | null {
    if (!json || json.trim().length === 0) return null;
    const empty: ItemAvailability = { bad: true, window: null, blocked: [], freeDates: [], placementName: "", dailyCapacity: null };
    let v: unknown;
    try {
        v = JSON.parse(json);
    } catch {
        return empty;
    }
    if (typeof v !== "object" || v === null || Array.isArray(v)) return empty;
    const o = v as Record<string, unknown>;
    let window: ItemAvailability["window"] = null;
    let bad = false;
    if ("availableFrom" in o || "availableTo" in o) {
        const f = o.availableFrom;
        const t = o.availableTo;
        if (typeof f === "string" && typeof t === "string" && DAY.test(f) && DAY.test(t) && f <= t) window = { availableFrom: f, availableTo: t };
        else bad = true;
    }
    return {
        bad,
        window,
        blocked: dateList(o.blockedDates ?? o.fullDates),
        freeDates: dateList(o.freeDates),
        placementName: typeof o.placementName === "string" ? o.placementName : "",
        dailyCapacity: typeof o.dailyCapacity === "number" ? o.dailyCapacity : null
    };
}

/** first blocked day inside [start, end], or "" */
function firstBlocked(start: string, end: string, blocked: string[]): string {
    if (!start || !end || blocked.length === 0) return "";
    const set = new Set(blocked);
    const d = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    for (let i = 0; d <= last && i < 800; i++) {
        const k = isoDay(d);
        if (set.has(k)) return k;
        d.setDate(d.getDate() + 1);
    }
    return "";
}

export const DateChangeDialog: React.FC<{
    item: ApprovalItem;
    action: ApprovalAction;
    availabilityJson: string;
    breakpoint: Breakpoint;
    onCancel: () => void;
    onConfirm: (comment: string, start: string, end: string) => void;
}> = ({ item, action, availabilityJson, breakpoint, onCancel, onConfirm }) => {
    const avail = React.useMemo(() => parseAvailability(availabilityJson), [availabilityJson]);
    const [start, setStart] = React.useState(isoDay(item.startDate));
    const [end, setEnd] = React.useState(isoDay(item.endDate));
    const [comment, setComment] = React.useState("");

    // JSON supplied but unreadable -> the dialog cannot validate, so it refuses (1.6 behaviour)
    const blockedInput = !!avail && avail.bad;
    const win = avail?.window ?? null;
    const blocked = avail?.blocked ?? [];

    let problem: string | null = null;
    if (start && end) {
        const hit = firstBlocked(start, end, blocked);
        if (end < start) problem = "The end date cannot be before the start date.";
        else if (win && (start < win.availableFrom || end > win.availableTo)) problem = "Revised dates must fall within the available period.";
        else if (hit)
            problem = `${longDay(hit)} is already at daily capacity${avail?.placementName ? ` for ${avail.placementName}` : ""}${
                avail?.dailyCapacity != null ? ` (${avail.dailyCapacity} slot/day)` : ""
            } — pick another date.`;
    }

    const valid = !blockedInput && start.length > 0 && end.length > 0 && problem === null && (!action.requiresComment || comment.trim().length > 0);

    const pick = (d: string): void => {
        const len = item.startDate && item.endDate ? Math.round((item.endDate.getTime() - item.startDate.getTime()) / 86400000) : 0;
        setStart(d);
        const e = new Date(`${d}T00:00:00`);
        e.setDate(e.getDate() + Math.max(0, len));
        setEnd(isoDay(e));
    };

    return (
        <DialogShell
            title={action.label}
            subtitle={item.itemName}
            breakpoint={breakpoint}
            onClose={onCancel}
            footer={
                <>
                    <Button variant="ghost" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={() => onConfirm(comment.trim(), start, end)} disabled={!valid}>
                        {action.label}
                    </Button>
                </>
            }
        >
            <div className="uam-compare">
                <div className="uam-compare__col">
                    <span className="uam-overline">Requested</span>
                    <span className="uam-compare__value">{period(item.startDate, item.endDate)}</span>
                </div>
                <span className="uam-compare__arrow">→</span>
                <div className="uam-compare__col">
                    <span className="uam-overline">Revised</span>
                    <span className="uam-compare__value uam-compare__value--new">
                        {start && end ? `${longDay(start)} – ${longDay(end)}` : "Pick dates"}
                    </span>
                </div>
            </div>

            {blockedInput ? (
                <p className="uam-callout uam-callout--danger">
                    <AlertIcon size={16} />
                    <span>Availability data is unavailable — revised dates cannot be validated.</span>
                </p>
            ) : win ? (
                <p className="uam-callout uam-callout--info">
                    <CalendarIcon size={16} />
                    <span>
                        Available {longDay(win.availableFrom)} – {longDay(win.availableTo)}
                        {avail?.placementName ? ` · ${avail.placementName}` : ""}
                    </span>
                </p>
            ) : (
                <p className="uam-callout uam-callout--info">
                    <CalendarIcon size={16} />
                    <span>Any revised period is allowed{avail?.placementName ? ` · ${avail.placementName}` : ""}.</span>
                </p>
            )}

            {blocked.length > 0 && (
                <p className="uam-muted uam-small">
                    {avail?.dailyCapacity != null ? `${avail.dailyCapacity} slot/day · ` : ""}fully booked: {blocked.slice(0, 6).map(longDay).join(", ")}
                    {blocked.length > 6 ? ` +${blocked.length - 6} more` : ""}
                </p>
            )}

            {avail && avail.freeDates.length > 0 && (
                <div className="uam-chips">
                    <span className="uam-chips__label">Nearest free</span>
                    {avail.freeDates.slice(0, 6).map((d) => (
                        <button type="button" key={d} className={cx("uam-chip", d === start && "uam-chip--active")} onClick={() => pick(d)}>
                            {longDay(d)}
                        </button>
                    ))}
                </div>
            )}

            <div className="uam-date-row">
                <label className="uam-field">
                    <span className="uam-field__label">
                        Start date<span className="uam-req"> *</span>
                    </span>
                    <input
                        type="date"
                        className="uam-input"
                        value={start}
                        min={win?.availableFrom}
                        max={win?.availableTo}
                        onChange={(e) => setStart(e.target.value)}
                        disabled={blockedInput}
                    />
                </label>
                <label className="uam-field">
                    <span className="uam-field__label">
                        End date<span className="uam-req"> *</span>
                    </span>
                    <input
                        type="date"
                        className="uam-input"
                        value={end}
                        min={start || win?.availableFrom}
                        max={win?.availableTo}
                        onChange={(e) => setEnd(e.target.value)}
                        disabled={blockedInput}
                    />
                </label>
            </div>
            {problem && <p className="uam-form-error">{problem}</p>}

            <label className="uam-field">
                <span className="uam-field__label">
                    Reason for change
                    {action.requiresComment ? <span className="uam-req"> *</span> : <span className="uam-muted"> (optional)</span>}
                </span>
                <textarea
                    className="uam-input uam-input--area"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="e.g. Requested day is full — moved to the nearest free slot"
                />
            </label>
        </DialogShell>
    );
};
