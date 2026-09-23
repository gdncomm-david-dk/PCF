import * as React from "react";
import { consumes } from "../lib/capacity";
import { dayCount, period, weekday } from "../lib/dates";
import { overlaps, personName, shown, statusTone } from "../lib/present";
import { ViewModel } from "./model";
import { Badge, EditIcon, IconButton, LockIcon, TrashIcon } from "./ui";

type SortKey = "start" | "campaign" | "placement" | "status";

export const ListView: React.FC<{ vm: ViewModel; compact: boolean }> = ({ vm, compact }) => {
    const { bookings, days, placementsById, config, rule } = vm;
    const [sort, setSort] = React.useState<SortKey>("start");
    const first = days[0];
    const last = days[days.length - 1];

    const rows = React.useMemo(() => {
        const visible = new Set(vm.placements.map((p) => p.id));
        const list = bookings.filter((b) => visible.has(b.placementId) && overlaps(b, first, last));
        const val = (b: (typeof list)[number]): string => {
            if (sort === "campaign") return shown(b, config).title.toLowerCase();
            if (sort === "placement") return (placementsById.get(b.placementId)?.name ?? b.placementId).toLowerCase();
            if (sort === "status") return (b.status ?? "").toLowerCase();
            return b.startDate;
        };
        return list.sort((a, b) => {
            const x = val(a);
            const y = val(b);
            return x === y ? (a.startDate < b.startDate ? -1 : 1) : x < y ? -1 : 1;
        });
    }, [bookings, vm.placements, first, last, sort, config, placementsById]);

    if (rows.length === 0)
        return (
            <div className="msc-card msc-empty">
                <strong>No bookings in this period</strong>
                <span>Move to another period or clear the search.</span>
            </div>
        );

    const actions = (id: string, masked: boolean) =>
        masked ? (
            <span className="msc-muted-icon" title="Booked by another team">
                <LockIcon size={14} />
            </span>
        ) : (
            <span className="msc-row-actions">
                {config.allowEdit && (
                    <IconButton label="Edit booking" onClick={(e) => (e.stopPropagation(), vm.onEdit(id))}>
                        <EditIcon size={15} />
                    </IconButton>
                )}
                {config.allowDelete && (
                    <IconButton label="Delete booking" className="is-danger" onClick={(e) => (e.stopPropagation(), vm.onDelete(id))}>
                        <TrashIcon size={15} />
                    </IconButton>
                )}
            </span>
        );

    if (compact)
        return (
            <div className="msc-cards">
                {rows.map((b) => {
                    const s = shown(b, config);
                    return (
                        <div key={b.id} role="button" tabIndex={0} className={`msc-bcard${vm.selectedBookingId === b.id ? " is-selected" : ""}`} onClick={() => vm.onSelectBooking(b.id)} onKeyDown={(e) => e.key === "Enter" && vm.onSelectBooking(b.id)}>
                            <div className="msc-bcard__top">
                                <strong>{s.title}</strong>
                                {b.status && !s.masked && <Badge tone={statusTone(b, rule)}>{b.status}</Badge>}
                            </div>
                            <span className="msc-bcard__meta">
                                {placementsById.get(b.placementId)?.name ?? b.placementId} · {period(b.startDate, b.endDate)}
                            </span>
                            <div className="msc-bcard__foot">
                                <span>{personName(s.requester)}</span>
                                {actions(b.id, s.masked)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );

    const head = (key: SortKey, label: string) => (
        <th aria-sort={sort === key ? "ascending" : "none"}>
            <button type="button" className={sort === key ? "is-on" : ""} onClick={() => setSort(key)}>
                {label}
            </button>
        </th>
    );

    return (
        <div className="msc-card msc-table-card">
            <div className="msc-scroll">
                <table className="msc-table">
                    <thead>
                        <tr>
                            {head("campaign", "Campaign")}
                            {head("placement", "Placement")}
                            {head("start", "Dates")}
                            {head("status", "Status")}
                            <th>Requester</th>
                            <th aria-label="Actions" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((b) => {
                            const s = shown(b, config);
                            const n = dayCount(b.startDate, b.endDate);
                            return (
                                <tr key={b.id} className={vm.selectedBookingId === b.id ? "is-selected" : ""} onClick={() => vm.onSelectBooking(b.id)}>
                                    <td>
                                        <span className="msc-table__title">{s.title}</span>
                                        {s.notes && <span className="msc-table__sub">{s.notes}</span>}
                                    </td>
                                    <td>{placementsById.get(b.placementId)?.name ?? b.placementId}</td>
                                    <td>
                                        <span className="msc-table__title">{period(b.startDate, b.endDate)}</span>
                                        <span className="msc-table__sub">
                                            {weekday(b.startDate)} · {n} day{n === 1 ? "" : "s"}
                                            {b.startTime && b.endTime && !(b.startTime === "00:00" && b.endTime === "23:59") ? ` · ${b.startTime}–${b.endTime}` : ""}
                                        </span>
                                    </td>
                                    <td>
                                        {b.status && !s.masked ? <Badge tone={statusTone(b, rule)}>{b.status}</Badge> : <span className="msc-faint">—</span>}
                                        {!consumes(b, rule) && !s.masked && <span className="msc-table__sub">slot not taken</span>}
                                    </td>
                                    <td>{personName(s.requester) || <span className="msc-faint">—</span>}</td>
                                    <td className="msc-table__actions">{actions(b.id, s.masked)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
