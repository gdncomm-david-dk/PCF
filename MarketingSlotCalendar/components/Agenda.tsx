import * as React from "react";
import { cellStat } from "../lib/capacity";
import { dayNum, shortDay, weekday } from "../lib/dates";
import { leftLabel, levelTone } from "../lib/present";
import { ViewModel } from "./model";
import { Badge, Meter } from "./ui";

/** Phone layout: a day strip and one card per placement for the chosen day. */
export const Agenda: React.FC<{ vm: ViewModel; day: string; onDay: (d: string) => void }> = ({ vm, day, onDay }) => (
    <div className="msc-agenda">
        <div className="msc-strip" role="tablist" aria-label="Day">
            {vm.days.map((d) => (
                <button key={d} type="button" role="tab" aria-selected={d === day} className={`msc-strip__day${d === day ? " is-on" : ""}${d === vm.today ? " is-today" : ""}`} onClick={() => onDay(d)}>
                    <span>{weekday(d)}</span>
                    <strong>{dayNum(d)}</strong>
                </button>
            ))}
        </div>
        <div className="msc-card msc-agenda__list">
            {vm.placements.map((p) => {
                const s = cellStat(vm.index, p, day);
                return (
                    <button key={p.id} type="button" className="msc-agenda__row" onClick={() => vm.onSelectCell(p.id, day)}>
                        <span className="msc-agenda__top">
                            <span className="msc-agenda__name">{p.name}</span>
                            <Badge tone={levelTone[s.level]}>{leftLabel(s.left, s.capacity)}</Badge>
                        </span>
                        <span className="msc-agenda__meta">
                            {s.used} of {s.capacity} taken · {shortDay(day)}
                            {s.tentative.length > 0 ? ` · ${s.tentative.length} pending` : ""}
                        </span>
                        <Meter pct={s.pct} level={s.level} />
                    </button>
                );
            })}
        </div>
    </div>
);
