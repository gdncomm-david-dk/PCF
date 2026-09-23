import * as React from "react";
import { cellStat } from "../lib/capacity";
import { dayNum, isWeekend, longDay, weekday } from "../lib/dates";
import { leftLabel } from "../lib/present";
import { ViewModel } from "./model";

/** Arrow keys move focus between cells of a grid whose buttons carry data-r / data-c. */
export function gridKeys(e: React.KeyboardEvent<HTMLElement>): void {
    const t = e.target as HTMLElement;
    const r = Number(t.dataset.r);
    const c = Number(t.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
    if (!d) return;
    const next = e.currentTarget.querySelector<HTMLElement>(`[data-r="${r + d[0]}"][data-c="${c + d[1]}"]`);
    if (next) {
        e.preventDefault();
        next.focus();
    }
}

/** Keeps today in view when a long range (a whole month) opens or changes. */
export function useScrollToToday(days: string[], today: string): React.RefObject<HTMLDivElement> {
    const ref = React.useRef<HTMLDivElement>(null);
    const first = days[0];
    React.useEffect(() => {
        const box = ref.current;
        const cell = box?.querySelector<HTMLElement>(".msc-day.is-today");
        const corner = box?.querySelector<HTMLElement>(".msc-grid__corner");
        if (!box || !cell) return;
        const x = cell.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
        box.scrollLeft = Math.max(0, x - (corner?.offsetWidth ?? 0) - cell.offsetWidth * 2);
    }, [first, days.length, today]);
    return ref;
}

export const DayHeader: React.FC<{ days: string[]; today: string; first?: string }> = ({ days, today, first = "Placement" }) => (
    <div className="msc-grid__head" role="row">
        <span className="msc-grid__corner" role="columnheader">
            {first}
        </span>
        {days.map((d) => (
            <span key={d} role="columnheader" className={["msc-day", isWeekend(d) ? "is-weekend" : "", d === today ? "is-today" : ""].join(" ")} aria-label={longDay(d)}>
                <span className="msc-day__wd">{weekday(d)}</span>
                <span className="msc-day__num">{dayNum(d)}</span>
            </span>
        ))}
    </div>
);

export const CapacityGrid: React.FC<{ vm: ViewModel }> = ({ vm }) => {
    const { days, placements, index, selected, today } = vm;
    const cols = `var(--msc-label-w) repeat(${days.length}, minmax(var(--msc-cell-min), 1fr))`;
    const scroller = useScrollToToday(days, today);
    return (
        <div className="msc-card msc-grid-card">
            <div className="msc-scroll" ref={scroller}>
                <div className="msc-grid" role="grid" aria-label="Placement capacity by date" style={{ gridTemplateColumns: cols, minWidth: `calc(var(--msc-label-w) + ${days.length} * var(--msc-cell-min))` }} onKeyDown={gridKeys}>
                    <DayHeader days={days} today={today} />
                    {placements.map((p, r) => (
                        <div className="msc-grid__row" role="row" key={p.id}>
                            <span className="msc-rowhead" role="rowheader">
                                <span className="msc-rowhead__name" title={p.name}>
                                    {p.name}
                                </span>
                                <span className="msc-rowhead__meta">
                                    {p.dailyCapacity} slot{p.dailyCapacity === 1 ? "" : "s"}/day
                                    {p.status && !/^active$/i.test(p.status) ? ` · ${p.status}` : ""}
                                </span>
                            </span>
                            {days.map((d, c) => {
                                const s = cellStat(index, p, d);
                                const isSel = selected?.placementId === p.id && selected.day === d;
                                const wide = p.dailyCapacity >= 100;
                                return (
                                    <span key={d} role="gridcell" className={["msc-cellwrap", isWeekend(d) ? "is-weekend" : "", d === today ? "is-today" : ""].join(" ")}>
                                        <button
                                            type="button"
                                            data-r={r}
                                            data-c={c}
                                            tabIndex={r === 0 && c === 0 ? 0 : -1}
                                            className={`msc-cap msc-cap--${s.level}${isSel ? " is-selected" : ""}`}
                                            aria-pressed={isSel}
                                            aria-label={`${p.name}, ${longDay(d)}: ${s.used} of ${s.capacity} booked, ${leftLabel(s.left, s.capacity)}${s.tentative.length ? `, ${s.tentative.length} pending` : ""}`}
                                            onClick={() => vm.onSelectCell(p.id, d)}
                                        >
                                            {wide ? (
                                                <>
                                                    <span className="msc-cap__num">{s.left}</span>
                                                    <span className="msc-cap__of">left</span>
                                                </>
                                            ) : (
                                                <span className="msc-cap__num">
                                                    {s.used}
                                                    <span className="msc-cap__of">/{s.capacity}</span>
                                                </span>
                                            )}
                                            {s.tentative.length > 0 && <span className="msc-cap__dot" />}
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <div className="msc-legend">
                <span>
                    <i className="msc-sw msc-sw--open" />
                    Available
                </span>
                <span>
                    <i className="msc-sw msc-sw--almost" />
                    Almost full
                </span>
                <span>
                    <i className="msc-sw msc-sw--full" />
                    Full
                </span>
                <span>
                    <i className="msc-sw-dot" />
                    Has pending booking
                </span>
                <span className="msc-legend__note">
                    {vm.rule.statuses.length > 0
                        ? `Only ${vm.config.capacityStatuses.join(" / ")} bookings count toward daily capacity`
                        : "Every booking except Cancelled / Rejected counts toward daily capacity"}
                </span>
            </div>
        </div>
    );
};
