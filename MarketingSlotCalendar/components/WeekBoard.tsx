import * as React from "react";
import { cellStat, consumes } from "../lib/capacity";
import { longDay } from "../lib/dates";
import { leftLabel, shown } from "../lib/present";
import { DayHeader, gridKeys } from "./CapacityGrid";
import { ViewModel } from "./model";
import { Meter, PlusIcon } from "./ui";

const MAX_CHIPS = 3;

/** One week, every cell listing its bookings; chips can be dragged to another day or placement. */
export const WeekBoard: React.FC<{ vm: ViewModel }> = ({ vm }) => {
    const { days, placements, index, config, rule, drag, bookingsById } = vm;
    const cols = `var(--msc-label-w) repeat(${days.length}, minmax(120px, 1fr))`;
    const [hover, setHover] = React.useState<string | null>(null);
    return (
        <div className="msc-card msc-grid-card">
            <div className="msc-scroll">
                <div className={`msc-grid msc-grid--week${drag.draggingId ? " is-dragging" : ""}`} role="grid" aria-label="Weekly booking schedule" style={{ gridTemplateColumns: cols, minWidth: `calc(var(--msc-label-w) + ${days.length} * 120px)` }} onKeyDown={gridKeys}>
                    <DayHeader days={days} today={vm.today} />
                    {placements.map((p, r) => (
                        <div className="msc-grid__row" role="row" key={p.id}>
                            <span className="msc-rowhead" role="rowheader">
                                <span className="msc-rowhead__name" title={p.name}>
                                    {p.name}
                                </span>
                                <span className="msc-rowhead__meta">
                                    {p.dailyCapacity} slot{p.dailyCapacity === 1 ? "" : "s"}/day
                                </span>
                            </span>
                            {days.map((d, c) => {
                                const s = cellStat(index, p, d);
                                const ids = [...s.counted, ...s.tentative];
                                const key = `${p.id}|${d}`;
                                const ok = drag.check(p.id, d);
                                const isSel = vm.selected?.placementId === p.id && vm.selected.day === d;
                                return (
                                    <div
                                        key={d}
                                        role="gridcell"
                                        className={[
                                            "msc-wcell",
                                            `msc-wcell--${s.level}`,
                                            d === vm.today ? "is-today" : "",
                                            isSel ? "is-selected" : "",
                                            ok === null ? "" : hover === key ? (ok ? "is-drop-ok" : "is-drop-bad") : ""
                                        ].join(" ")}
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
                                    >
                                        <button
                                            type="button"
                                            className="msc-wcell__head"
                                            data-r={r}
                                            data-c={c}
                                            tabIndex={r === 0 && c === 0 ? 0 : -1}
                                            aria-label={`${p.name}, ${longDay(d)}: ${s.used} of ${s.capacity} booked`}
                                            onClick={() => vm.onSelectCell(p.id, d)}
                                        >
                                            <span className="msc-wcell__count">
                                                {s.used}/{s.capacity}
                                            </span>
                                            <span className={`msc-wcell__left msc-tone--${s.level}`}>{leftLabel(s.left, s.capacity)}</span>
                                        </button>
                                        <Meter pct={s.pct} level={s.level} />
                                        <div className="msc-wcell__chips">
                                            {ids.slice(0, MAX_CHIPS).map((id) => {
                                                const b = bookingsById.get(id);
                                                if (!b) return null;
                                                const sh = shown(b, config);
                                                const movable = vm.canMoveBookings && !sh.masked;
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        className={[
                                                            "msc-chip",
                                                            sh.masked ? "msc-chip--masked" : consumes(b, rule) ? "msc-chip--counted" : "msc-chip--tentative",
                                                            vm.selectedBookingId === id ? "is-selected" : "",
                                                            drag.draggingId === id ? "is-dragging" : ""
                                                        ].join(" ")}
                                                        title={`${sh.title}${b.status ? ` · ${b.status}` : ""}`}
                                                        draggable={movable}
                                                        onDragStart={(e) => {
                                                            e.dataTransfer.effectAllowed = "move";
                                                            e.dataTransfer.setData("text/plain", id);
                                                            drag.start(id);
                                                        }}
                                                        onDragEnd={() => {
                                                            setHover(null);
                                                            drag.end();
                                                        }}
                                                        onClick={() => vm.onSelectBooking(id)}
                                                    >
                                                        {sh.title}
                                                    </button>
                                                );
                                            })}
                                            {ids.length > MAX_CHIPS && (
                                                <button type="button" className="msc-chip msc-chip--more" onClick={() => vm.onSelectCell(p.id, d)}>
                                                    +{ids.length - MAX_CHIPS} more
                                                </button>
                                            )}
                                            {config.allowCreate && s.left > 0 && (
                                                <button type="button" className="msc-wcell__add" aria-label={`Add a booking to ${p.name} on ${longDay(d)}`} onClick={() => vm.onCreate(p.id, d)}>
                                                    <PlusIcon size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
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
                    Pending
                </span>
                <span className="msc-legend__note">{vm.canMoveBookings ? "Drag a booking to another day or placement" : "Click a booking for details"}</span>
            </div>
        </div>
    );
};
