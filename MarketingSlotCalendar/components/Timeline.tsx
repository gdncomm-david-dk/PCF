import * as React from "react";
import { consumes } from "../lib/capacity";
import { longDay, period } from "../lib/dates";
import { overlaps, packLanes, personName, shown } from "../lib/present";
import { DayHeader, useScrollToToday } from "./CapacityGrid";
import { ViewModel } from "./model";

/** Bookings as bars across dates; one lane per overlap, drag a bar to move it. */
export const Timeline: React.FC<{ vm: ViewModel }> = ({ vm }) => {
    const { days, placements, bookings, config, rule, drag } = vm;
    const first = days[0];
    const last = days[days.length - 1];
    const cols = `var(--msc-label-w) repeat(${days.length}, minmax(var(--msc-cell-min), 1fr))`;
    const [hover, setHover] = React.useState<string | null>(null);
    const scroller = useScrollToToday(days, vm.today);

    const rows = React.useMemo(
        () =>
            placements.map((p) => {
                const mine = bookings.filter((b) => b.placementId === p.id && overlaps(b, first, last));
                const lanes = packLanes(mine);
                return { p, lanes, count: Math.max(1, ...lanes.map((l) => l.lane + 1)) };
            }),
        [placements, bookings, first, last]
    );

    return (
        <div className="msc-card msc-grid-card">
            <div className="msc-scroll" ref={scroller}>
                <div className={`msc-grid msc-grid--bars${drag.draggingId ? " is-dragging" : ""}`} role="grid" aria-label="Campaign timeline" style={{ gridTemplateColumns: cols, minWidth: `calc(var(--msc-label-w) + ${days.length} * var(--msc-cell-min))` }}>
                    <DayHeader days={days} today={vm.today} />
                    {rows.map(({ p, lanes, count }) => (
                        <div
                            key={p.id}
                            className="msc-lanes"
                            role="row"
                            style={{ gridColumn: `1 / span ${days.length + 1}`, gridTemplateColumns: cols, gridTemplateRows: `repeat(${count}, var(--msc-lane-h))` }}
                        >
                            <span className="msc-rowhead" role="rowheader" style={{ gridRow: `1 / span ${count}` }}>
                                <span className="msc-rowhead__name" title={p.name}>
                                    {p.name}
                                </span>
                                <span className="msc-rowhead__meta">
                                    {p.dailyCapacity} slot{p.dailyCapacity === 1 ? "" : "s"}/day · {lanes.length} booking{lanes.length === 1 ? "" : "s"}
                                </span>
                            </span>
                            {days.map((d, i) => {
                                const ok = drag.check(p.id, d);
                                const key = `${p.id}|${d}`;
                                return (
                                    <span
                                        key={d}
                                        className={[
                                            "msc-slot",
                                            d === vm.today ? "is-today" : "",
                                            !vm.selectedBookingId && vm.selected?.placementId === p.id && vm.selected.day === d ? "is-selected" : "",
                                            ok === null ? "" : hover === key ? (ok ? "is-drop-ok" : "is-drop-bad") : ""
                                        ].join(" ")}
                                        style={{ gridColumn: i + 2, gridRow: `1 / span ${count}` }}
                                        onClick={() => vm.onSelectCell(p.id, d)}
                                        onDragOver={(e) => {
                                            if (ok === null) return;
                                            if (ok) e.preventDefault();
                                            if (hover !== key) setHover(key);
                                        }}
                                        onDragLeave={() => setHover((h) => (h === key ? null : h))}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setHover(null);
                                            drag.drop(p.id, d);
                                        }}
                                    />
                                );
                            })}
                            {lanes.map(({ booking: b, lane }) => {
                                const s = shown(b, config);
                                const from = Math.max(0, days.indexOf(b.startDate < first ? first : b.startDate));
                                const to = days.indexOf(b.endDate > last ? last : b.endDate);
                                const counts = consumes(b, rule);
                                const movable = vm.canMoveBookings && !s.masked;
                                const cls = [
                                    "msc-bar",
                                    s.masked ? "msc-bar--masked" : counts ? "msc-bar--counted" : "msc-bar--tentative",
                                    b.startDate < first ? "is-clipped-start" : "",
                                    b.endDate > last ? "is-clipped-end" : "",
                                    vm.selectedBookingId === b.id ? "is-selected" : "",
                                    drag.draggingId === b.id ? "is-dragging" : ""
                                ].join(" ");
                                const tip = `${s.title} · ${period(b.startDate, b.endDate)}${b.status ? ` · ${b.status}` : ""}${s.requester ? ` · ${personName(s.requester)}` : ""}`;
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        className={cls}
                                        style={{ gridColumn: `${from + 2} / ${to + 3}`, gridRow: lane + 1 }}
                                        title={tip}
                                        aria-label={`${tip}. Starts ${longDay(b.startDate)}`}
                                        draggable={movable}
                                        onDragStart={(e) => {
                                            e.dataTransfer.effectAllowed = "move";
                                            e.dataTransfer.setData("text/plain", b.id);
                                            drag.start(b.id);
                                        }}
                                        onDragEnd={() => {
                                            setHover(null);
                                            drag.end();
                                        }}
                                        onClick={() => vm.onSelectBooking(b.id)}
                                        onDoubleClick={() => !s.masked && config.allowEdit && vm.onEdit(b.id)}
                                    >
                                        <span className="msc-bar__label">{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="msc-legend">
                <span>
                    <i className="msc-sw msc-sw--bar" />
                    Uses capacity
                </span>
                <span>
                    <i className="msc-sw msc-sw--bar-tentative" />
                    Pending (slot not taken yet)
                </span>
                {config.maskOtherBookings && (
                    <span>
                        <i className="msc-sw msc-sw--bar-masked" />
                        Other team
                    </span>
                )}
                <span className="msc-legend__note">{vm.canMoveBookings ? "Drag a bar to move it · double-click to edit" : "Click a bar for details"}</span>
            </div>
        </div>
    );
};
