import * as React from "react";
import { CapacityIndex, CapacityRule, cellStat, consumes, validate } from "../lib/capacity";
import { dayCount, dayNum, dayRange, weekday } from "../lib/dates";
import { Booking, Placement } from "../lib/types";
import { AlertIcon, Button, InfoIcon, Modal } from "./ui";

interface Props {
    initial: Booking;
    isEdit: boolean;
    placements: Placement[];
    index: CapacityIndex;
    rule: CapacityRule;
    statuses: string[];
    onClose: () => void;
    onSave: (b: Booking) => void;
}

const ALL_DAY: [string, string] = ["00:00", "23:59"];
const PREVIEW_DAYS = 31;

export const BookingDialog: React.FC<Props> = ({ initial, isEdit, placements, index, rule, statuses, onClose, onSave }) => {
    const [draft, setDraft] = React.useState<Booking>(initial);
    const [allDay, setAllDay] = React.useState(() => (initial.startTime ?? ALL_DAY[0]) === ALL_DAY[0] && (initial.endTime ?? ALL_DAY[1]) === ALL_DAY[1]);
    const [touched, setTouched] = React.useState(false);
    const set = (patch: Partial<Booking>) => setDraft((d) => ({ ...d, ...patch }));

    const placement = placements.find((p) => p.id === draft.placementId);
    const counts = consumes(draft, rule);
    const check = validate(index, placement, draft.startDate, draft.endDate, isEdit ? draft.id : undefined);
    const nameError = draft.campaignName.trim() === "" ? "Campaign name is required." : undefined;
    const rangeOk = !!draft.startDate && !!draft.endDate && draft.endDate >= draft.startDate;
    const capacityBlocks = counts && !check.ok && check.conflicts.length > 0;
    const blocking = nameError ?? (!placement ? "Pick a placement." : !rangeOk ? check.message : capacityBlocks ? check.message : undefined);
    const days = rangeOk ? dayRange(draft.startDate, draft.endDate, PREVIEW_DAYS) : [];
    const options = statuses.includes(draft.status ?? "") || !draft.status ? statuses : [draft.status, ...statuses];

    const save = () => {
        setTouched(true);
        if (blocking) return;
        const [st, et] = allDay ? ALL_DAY : [draft.startTime || ALL_DAY[0], draft.endTime || ALL_DAY[1]];
        onSave({ ...draft, campaignName: draft.campaignName.trim(), startTime: st, endTime: et, notes: draft.notes?.trim() || undefined, requester: draft.requester?.trim() || undefined });
    };

    return (
        <Modal
            title={isEdit ? "Edit booking" : "New booking"}
            subtitle={isEdit ? initial.campaignName : "Reserve a placement for a campaign"}
            onClose={onClose}
            width={560}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={save} disabled={touched && !!blocking}>
                        {isEdit ? "Save changes" : "Create booking"}
                    </Button>
                </>
            }
        >
            <form
                className="msc-form"
                onSubmit={(e) => {
                    e.preventDefault();
                    save();
                }}
            >
                <label className="msc-field msc-field--full">
                    <span>Campaign name</span>
                    <input value={draft.campaignName} placeholder="For example, Payday Sale" onChange={(e) => set({ campaignName: e.target.value })} aria-invalid={touched && !!nameError} />
                    {touched && nameError && <em className="msc-field__err">{nameError}</em>}
                </label>
                <label className="msc-field msc-field--full">
                    <span>Placement</span>
                    <select value={draft.placementId} onChange={(e) => set({ placementId: e.target.value })}>
                        {!placement && <option value="">Select a placement</option>}
                        {placements.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name} · {p.dailyCapacity}/day
                            </option>
                        ))}
                    </select>
                </label>
                <label className="msc-field">
                    <span>Start date</span>
                    <input type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: draft.endDate < e.target.value ? e.target.value : draft.endDate })} />
                </label>
                <label className="msc-field">
                    <span>End date</span>
                    <input type="date" value={draft.endDate} min={draft.startDate} onChange={(e) => set({ endDate: e.target.value })} />
                </label>
                <label className="msc-check msc-field--full">
                    <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                    <span>All day</span>
                </label>
                {!allDay && (
                    <>
                        <label className="msc-field">
                            <span>Start time</span>
                            <input type="time" value={draft.startTime ?? ""} onChange={(e) => set({ startTime: e.target.value })} />
                        </label>
                        <label className="msc-field">
                            <span>End time</span>
                            <input type="time" value={draft.endTime ?? ""} onChange={(e) => set({ endTime: e.target.value })} />
                        </label>
                    </>
                )}
                <label className="msc-field">
                    <span>Status</span>
                    <select value={draft.status ?? ""} onChange={(e) => set({ status: e.target.value || undefined })}>
                        {options.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="msc-field">
                    <span>Requester</span>
                    <input value={draft.requester ?? ""} placeholder="name@company.com" onChange={(e) => set({ requester: e.target.value })} />
                </label>
                <label className="msc-field msc-field--full">
                    <span>Notes</span>
                    <textarea rows={2} value={draft.notes ?? ""} placeholder="Anything the placement owner should know" onChange={(e) => set({ notes: e.target.value })} />
                </label>

                {placement && days.length > 0 && (
                    <div className="msc-field--full msc-avail">
                        <span className="msc-avail__label">
                            Availability · {dayCount(draft.startDate, draft.endDate)} day{dayCount(draft.startDate, draft.endDate) === 1 ? "" : "s"}
                        </span>
                        <div className="msc-avail__strip">
                            {days.map((d) => {
                                const s = cellStat(index, placement, d, isEdit ? draft.id : undefined);
                                const full = s.left === 0;
                                return (
                                    <span key={d} className={`msc-avail__day${full ? " is-full" : s.left === 1 ? " is-almost" : ""}`} title={`${s.used} of ${s.capacity} taken`}>
                                        <span>{weekday(d)}</span>
                                        <strong>{dayNum(d)}</strong>
                                        <em>{full ? "full" : `${s.left} left`}</em>
                                    </span>
                                );
                            })}
                            {dayCount(draft.startDate, draft.endDate) > PREVIEW_DAYS && <span className="msc-avail__more">…</span>}
                        </div>
                    </div>
                )}

                {placement && rangeOk && !check.ok && check.conflicts.length > 0 && (
                    <div className={`msc-field--full msc-note ${counts ? "msc-note--bad" : "msc-note--warn"}`} role="alert">
                        <AlertIcon size={16} />
                        <span>
                            {check.message}
                            {counts ? " Pick other dates or another placement." : ` Saved as ${draft.status || "this status"}, it will not take a slot, so it can still be saved.`}
                        </span>
                    </div>
                )}
                {touched && !rangeOk && (
                    <div className="msc-field--full msc-note msc-note--bad" role="alert">
                        <AlertIcon size={16} />
                        <span>{check.message}</span>
                    </div>
                )}
                {placement && rangeOk && check.ok && !counts && (
                    <div className="msc-field--full msc-note msc-note--info">
                        <InfoIcon size={16} />
                        <span>{draft.status || "This status"} does not take a slot; the days stay free for others until it is confirmed.</span>
                    </div>
                )}
                <button type="submit" hidden />
            </form>
        </Modal>
    );
};

export const ConfirmDialog: React.FC<{ title: string; body: string; confirm: string; onClose: () => void; onConfirm: () => void }> = ({ title, body, confirm, onClose, onConfirm }) => (
    <Modal
        title={title}
        onClose={onClose}
        width={420}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm}>
                    {confirm}
                </Button>
            </>
        }
    >
        <p className="msc-confirm">{body}</p>
    </Modal>
);
