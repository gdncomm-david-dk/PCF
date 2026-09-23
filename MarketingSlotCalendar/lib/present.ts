import type { Tone } from "../components/ui";
import { CapacityRule, consumes, isReleased } from "./capacity";
import { Booking, CalendarConfig, Level } from "./types";

export function statusTone(b: Booking, rule: CapacityRule): Tone {
    const s = (b.status ?? "").toLowerCase();
    if (isReleased(b)) return "bad";
    if (/pending|waiting|draft|hold|review/.test(s)) return "warn";
    if (/confirm|approved|booked|live|airing/.test(s)) return "ok";
    return consumes(b, rule) ? "ok" : "neutral";
}

export const levelTone: Record<Level, Tone> = { empty: "ok", open: "ok", almost: "warn", full: "bad" };

export function leftLabel(left: number, capacity: number): string {
    if (capacity <= 0 || left <= 0) return "Full";
    return `${left} left`;
}

/** Someone else's booking on a masked (requestor) calendar. */
export function isMasked(b: Booking, config: CalendarConfig): boolean {
    if (!config.maskOtherBookings) return false;
    if (config.currentUser === "") return true;
    return (b.requester ?? "").trim().toLowerCase() !== config.currentUser;
}

export interface Shown {
    title: string;
    requester?: string;
    notes?: string;
    masked: boolean;
}

export function shown(b: Booking, config: CalendarConfig): Shown {
    if (isMasked(b, config)) return { title: "Booked", masked: true };
    return { title: b.campaignName, requester: b.requester, notes: b.notes && b.notes !== "-" ? b.notes : undefined, masked: false };
}

/** Turns an email into "Rizky Adiputra"; other values are kept as typed. */
export function personName(v: string | undefined): string {
    if (!v) return "";
    const at = v.indexOf("@");
    if (at <= 0) return v;
    return v
        .slice(0, at)
        .split(/[._-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/** Greedy lane packing: each booking takes the first lane that is free on its first day. */
export function packLanes(bookings: Booking[]): { booking: Booking; lane: number }[] {
    const sorted = [...bookings].sort((a, b) => (a.startDate === b.startDate ? (a.endDate < b.endDate ? 1 : -1) : a.startDate < b.startDate ? -1 : 1));
    const laneEnds: string[] = [];
    return sorted.map((booking) => {
        let lane = laneEnds.findIndex((end) => end < booking.startDate);
        if (lane === -1) {
            lane = laneEnds.length;
            laneEnds.push(booking.endDate);
        } else laneEnds[lane] = booking.endDate;
        return { booking, lane };
    });
}

export const overlaps = (b: Booking, start: string, end: string): boolean => b.startDate <= end && b.endDate >= start;
