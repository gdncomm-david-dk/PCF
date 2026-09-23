import { addDays, dayRange, longDay, shortDay } from "./dates";
import { Booking, CellStat, Level, Placement } from "./types";

const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
const RELEASED = ["cancelled", "canceled", "rejected"];

export interface CapacityRule {
    /** lower-cased statuses that consume capacity; empty = everything except cancelled / rejected */
    statuses: string[];
}

export function makeRule(capacityStatuses: string[]): CapacityRule {
    return { statuses: capacityStatuses.map(norm) };
}

/** A released booking (cancelled / rejected) keeps nothing, not even a pending marker. */
export const isReleased = (b: Booking): boolean => RELEASED.includes(norm(b.status));

export function consumes(b: Booking, rule: CapacityRule): boolean {
    if (rule.statuses.length > 0) return rule.statuses.includes(norm(b.status));
    return !isReleased(b);
}

export const passesInclude = (b: Booking, include: string[]): boolean =>
    include.length === 0 || include.some((s) => norm(s) === norm(b.status));

interface Slot {
    counted: string[];
    tentative: string[];
}
export type CapacityIndex = Map<string, Map<string, Slot>>;

export function buildIndex(bookings: Booking[], rule: CapacityRule): CapacityIndex {
    const index: CapacityIndex = new Map();
    for (const b of bookings) {
        const counts = consumes(b, rule);
        if (!counts && isReleased(b)) continue;
        let row = index.get(b.placementId);
        if (!row) {
            row = new Map();
            index.set(b.placementId, row);
        }
        for (const day of dayRange(b.startDate, b.endDate)) {
            let slot = row.get(day);
            if (!slot) {
                slot = { counted: [], tentative: [] };
                row.set(day, slot);
            }
            (counts ? slot.counted : slot.tentative).push(b.id);
        }
    }
    return index;
}

export function levelFor(used: number, capacity: number): Level {
    if (capacity <= 0 || used >= capacity) return "full";
    if (used <= 0) return "empty";
    const left = capacity - used;
    if (left === 1 || used / capacity >= 0.8) return "almost";
    return "open";
}

export function cellStat(index: CapacityIndex, placement: Placement, day: string, ignoreId?: string): CellStat {
    const slot = index.get(placement.id)?.get(day);
    const counted = (slot?.counted ?? []).filter((id) => id !== ignoreId);
    const tentative = (slot?.tentative ?? []).filter((id) => id !== ignoreId);
    const capacity = placement.dailyCapacity;
    const used = counted.length;
    return {
        used,
        capacity,
        left: Math.max(0, capacity - used),
        pct: capacity <= 0 ? 100 : Math.min(100, Math.round((used / capacity) * 100)),
        level: levelFor(used, capacity),
        counted,
        tentative
    };
}

export interface Summary {
    totalSlots: number;
    booked: number;
    available: number;
    almostFull: number;
    fullyBooked: number;
    pending: number;
    utilization: number;
}

export function summarize(index: CapacityIndex, placements: Placement[], days: string[]): Summary {
    let totalSlots = 0;
    let booked = 0;
    let almostFull = 0;
    let fullyBooked = 0;
    const pending = new Set<string>();
    for (const p of placements) {
        for (const d of days) {
            const s = cellStat(index, p, d);
            totalSlots += p.dailyCapacity;
            booked += Math.min(s.used, p.dailyCapacity);
            if (s.level === "almost") almostFull += 1;
            if (s.level === "full") fullyBooked += 1;
            s.tentative.forEach((id) => pending.add(id));
        }
    }
    return {
        totalSlots,
        booked,
        available: Math.max(0, totalSlots - booked),
        almostFull,
        fullyBooked,
        pending: pending.size,
        utilization: totalSlots <= 0 ? 0 : Math.round((booked / totalSlots) * 100)
    };
}

export interface Conflict {
    day: string;
    used: number;
    capacity: number;
}

export interface Validation {
    ok: boolean;
    message?: string;
    conflicts: Conflict[];
}

/** Would a booking on these days overflow the placement? `ignoreId` excludes the booking being edited. */
export function validate(index: CapacityIndex, placement: Placement | undefined, start: string, end: string, ignoreId?: string): Validation {
    if (!placement) return { ok: false, message: "Pick a placement.", conflicts: [] };
    if (!start || !end) return { ok: false, message: "Pick a start and an end date.", conflicts: [] };
    if (end < start) return { ok: false, message: "The end date must be on or after the start date.", conflicts: [] };
    const conflicts: Conflict[] = [];
    for (const day of dayRange(start, end)) {
        const s = cellStat(index, placement, day, ignoreId);
        if (s.used >= placement.dailyCapacity) conflicts.push({ day, used: s.used, capacity: placement.dailyCapacity });
    }
    if (conflicts.length === 0) return { ok: true, conflicts };
    const first = conflicts[0];
    return {
        ok: false,
        message:
            conflicts.length === 1
                ? `${placement.name} is fully booked on ${longDay(first.day)}.`
                : `${placement.name} is fully booked on ${conflicts.length} of the selected days, starting ${shortDay(first.day)}.`,
        conflicts
    };
}

/** The next few days, after `from`, on which the placement still has a free slot. */
export function nearestFree(index: CapacityIndex, placement: Placement, from: string, count = 3, horizon = 60): string[] {
    const out: string[] = [];
    for (let i = 1; i <= horizon && out.length < count; i += 1) {
        const day = addDays(from, i);
        if (cellStat(index, placement, day).left > 0) out.push(day);
    }
    return out;
}
