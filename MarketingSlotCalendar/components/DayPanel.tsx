import * as React from "react";
import { cellStat, nearestFree } from "../lib/capacity";
import { isSelecting } from "../lib/copy";
import { dayCount, longDay, period, shortDay } from "../lib/dates";
import { leftLabel, levelTone, personName, shown, statusTone } from "../lib/present";
import { Booking, Placement } from "../lib/types";
import { ViewModel } from "./model";
import { Badge, Button, CalendarIcon, CloseIcon, CopyButton, EditIcon, IconButton, LockIcon, Meter, PlusIcon, SpinnerIcon, TrashIcon } from "./ui";

const allDay = (b: Booking): boolean => !b.startTime || !b.endTime || (b.startTime === "00:00" && b.endTime === "23:59");

/** The selected booking as plain lines, for the Copy details button. */
function detailText(b: Booking, placement: string): string {
    const n = dayCount(b.startDate, b.endDate);
    return [
        b.campaignName,
        `Placement: ${placement}`,
        `Period: ${period(b.startDate, b.endDate)} (${n} day${n === 1 ? "" : "s"})`,
        allDay(b) ? "" : `Time: ${b.startTime}–${b.endTime}`,
        b.status ? `Status: ${b.status}` : "",
        b.requester ? `Requester: ${personName(b.requester)}${b.requester.includes("@") ? ` <${b.requester}>` : ""}` : "",
        b.notes && b.notes !== "-" ? `Notes: ${b.notes}` : "",
        b.id && !b.id.startsWith("new-") ? `Booking ID: ${b.id}` : ""
    ]
        .filter(Boolean)
        .join("\n");
}

interface Props {
    vm: ViewModel;
    placement: Placement | undefined;
    day: string | null;
    asSheet: boolean;
    onClose: () => void;
    onJump: (day: string) => void;
}

export const DayPanel: React.FC<Props> = ({ vm, placement, day, asSheet, onClose, onJump }) => {
    const { config, index, bookingsById, rule } = vm;

    if (!placement || !day) {
        if (asSheet) return null;
        return (
            <aside className="msc-card msc-panel msc-panel--idle" aria-label="Day detail">
                <span className="msc-panel__idle-icon">
                    <CalendarIcon size={22} />
                </span>
                <strong>Pick a day</strong>
                <span>Select a cell to see who has the slot, what is still free and the nearest open dates.</span>
            </aside>
        );
    }

    const s = cellStat(index, placement, day);
    const counted = s.counted.map((id) => bookingsById.get(id)).filter(Boolean);
    const tentative = s.tentative.map((id) => bookingsById.get(id)).filter(Boolean);
    const nearest = s.left === 0 ? nearestFree(index, placement, day) : [];
    const canAdd = config.allowCreate && s.left > 0;

    const item = (id: string) => {
        const b = bookingsById.get(id);
        if (!b) return null;
        const sh = shown(b, config);
        const open = vm.selectedBookingId === id && !sh.masked;
        const saving = vm.savingIds.has(id);
        const meta = [period(b.startDate, b.endDate), personName(sh.requester)].filter(Boolean).join(" · ");
        const select = () => !isSelecting() && vm.onSelectBooking(id);
        const where = vm.placementsById.get(b.placementId)?.name ?? b.placementId;
        const n = dayCount(b.startDate, b.endDate);
        return (
            <li key={id} className={`msc-bitem${open ? " is-selected is-open" : ""}${saving ? " is-saving" : ""}`}>
                <div className="msc-bitem__row">
                    <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={sh.masked ? undefined : open}
                        className="msc-bitem__main"
                        onClick={select}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), vm.onSelectBooking(id))}
                    >
                        <span className="msc-bitem__name">{sh.title}</span>
                        <span className="msc-bitem__meta">{meta}</span>
                        {sh.notes && !open && <span className="msc-bitem__notes">{sh.notes}</span>}
                    </div>
                    <span className="msc-bitem__side">
                        {saving ? (
                            <Badge tone="info" title="Waiting for the app to confirm this change">
                                <SpinnerIcon size={11} className="msc-spin" /> Saving
                            </Badge>
                        ) : (
                            b.status && !sh.masked && <Badge tone={statusTone(b, rule)}>{b.status}</Badge>
                        )}
                        {sh.masked ? (
                            <span className="msc-muted-icon" title="Booked by another team">
                                <LockIcon size={14} />
                            </span>
                        ) : (
                            <span className="msc-row-actions">
                                {config.allowEdit && (
                                    <IconButton label={`Edit ${sh.title}`} onClick={() => vm.onEdit(id)}>
                                        <EditIcon size={15} />
                                    </IconButton>
                                )}
                                {config.allowDelete && (
                                    <IconButton label={`Delete ${sh.title}`} className="is-danger" onClick={() => vm.onDelete(id)}>
                                        <TrashIcon size={15} />
                                    </IconButton>
                                )}
                            </span>
                        )}
                    </span>
                </div>
                {open && (
                    <div className="msc-bitem__detail">
                        <dl className="msc-facts">
                            <dt>Placement</dt>
                            <dd>{where}</dd>
                            <dt>Period</dt>
                            <dd>
                                {period(b.startDate, b.endDate)} · {n} day{n === 1 ? "" : "s"}
                                {allDay(b) ? "" : ` · ${b.startTime}–${b.endTime}`}
                            </dd>
                            {b.requester && (
                                <>
                                    <dt>Requester</dt>
                                    <dd>
                                        {personName(b.requester)}
                                        {b.requester.includes("@") && <span className="msc-facts__sub">{b.requester}</span>}
                                    </dd>
                                </>
                            )}
                            {sh.notes && (
                                <>
                                    <dt>Notes</dt>
                                    <dd className="msc-facts__notes">{sh.notes}</dd>
                                </>
                            )}
                            {!b.id.startsWith("new-") && (
                                <>
                                    <dt>ID</dt>
                                    <dd className="msc-mono">{b.id}</dd>
                                </>
                            )}
                        </dl>
                        <CopyButton text={detailText(b, where)} label="Copy booking details">
                            Copy details
                        </CopyButton>
                    </div>
                )}
            </li>
        );
    };

    const body = (
        <>
            <div className="msc-panel__head">
                <div>
                    <span className="msc-panel__date">
                        {longDay(day)}
                        {day === vm.today ? " · Today" : ""}
                    </span>
                    <h3 className="msc-panel__title">{placement.name}</h3>
                </div>
                <IconButton label="Close details" onClick={onClose}>
                    <CloseIcon size={18} />
                </IconButton>
            </div>

            <div className="msc-panel__usage">
                <div className="msc-panel__usage-row">
                    <span>
                        <strong>{s.used}</strong> of {s.capacity} slot{s.capacity === 1 ? "" : "s"} taken
                    </span>
                    <Badge tone={levelTone[s.level]}>{leftLabel(s.left, s.capacity)}</Badge>
                </div>
                <Meter pct={s.pct} level={s.level} />
            </div>

            {tentative.length > 0 && (
                <div className="msc-note msc-note--warn">
                    {tentative.length} pending booking{tentative.length === 1 ? "" : "s"} on this day. {tentative.length === 1 ? "It does" : "They do"} not take a slot until{" "}
                    {tentative.length === 1 ? "it is" : "they are"} {config.capacityStatuses.join(" / ") || "confirmed"}.
                </div>
            )}

            <div className="msc-panel__section">
                <span className="msc-panel__label">Taking a slot</span>
                {counted.length === 0 ? <p className="msc-panel__empty">Nobody has this slot yet.</p> : <ul className="msc-blist">{s.counted.map(item)}</ul>}
            </div>
            {tentative.length > 0 && (
                <div className="msc-panel__section">
                    <span className="msc-panel__label">Pending</span>
                    <ul className="msc-blist">{s.tentative.map(item)}</ul>
                </div>
            )}

            {nearest.length > 0 && (
                <div className="msc-panel__nearest">
                    <span className="msc-panel__label">Nearest free</span>
                    <div>
                        {nearest.map((d) => (
                            <button key={d} type="button" className="msc-pill" onClick={() => onJump(d)}>
                                {shortDay(d)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {config.allowCreate && (
                <div className="msc-panel__cta">
                    <Button variant={canAdd ? "primary" : "outline"} block icon={<PlusIcon size={16} />} disabled={!canAdd && nearest.length === 0} onClick={() => (canAdd ? vm.onCreate(placement.id, day) : vm.onCreate(placement.id, nearest[0]))}>
                        {canAdd ? "Add booking" : nearest.length > 0 ? `Book ${shortDay(nearest[0])} instead` : "No free slot soon"}
                    </Button>
                </div>
            )}
        </>
    );

    if (asSheet)
        return (
            <div className="msc-overlay msc-overlay--sheet" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <aside className="msc-sheet" role="dialog" aria-modal="true" aria-label={`${placement.name}, ${longDay(day)}`} onKeyDown={(e) => e.key === "Escape" && onClose()}>
                    <span className="msc-sheet__grab" aria-hidden="true" />
                    {body}
                </aside>
            </div>
        );
    return (
        <aside className="msc-card msc-panel" aria-label="Day detail">
            {body}
        </aside>
    );
};
