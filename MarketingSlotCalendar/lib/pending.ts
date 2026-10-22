import { isReleased } from "./capacity";
import { Booking } from "./types";

/**
 * A change the calendar has shown but the app has not confirmed yet. The calendar draws the app's
 * bookings with these changes laid over them, and drops each one as soon as the app's data carries
 * it (saved) or once it is too old (not saved).
 */
export interface PendingChange {
    /** booking id; for a create, the temporary new-… id */
    id: string;
    kind: "create" | "update" | "delete";
    /** create / update: the booking as the user left it; delete: the booking that was removed */
    booking: Booking;
    /** "moved" for a drag, so the messages can say so */
    label?: string;
    /** create: ids the app already had, so the new row is any other id with the same fields */
    known?: Set<string>;
    at: number;
}

const norm = (v?: string): string => (v ?? "").trim().toLowerCase();
const noteNorm = (v?: string): string => (norm(v) === "-" ? "" : norm(v));
const timeNorm = (v?: string): string => {
    const m = /(\d{1,2}):(\d{2})/.exec(v ?? "");
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : norm(v);
};

/** Does the app's row carry what the user saved? Fields the app does not send are not compared. */
export function sameBooking(app: Booking, want: Booking): boolean {
    if (app.placementId !== want.placementId || app.startDate !== want.startDate || app.endDate !== want.endDate) return false;
    if (norm(app.campaignName) !== norm(want.campaignName)) return false;
    if (app.status !== undefined && want.status !== undefined && norm(app.status) !== norm(want.status)) return false;
    if (app.requester !== undefined && want.requester !== undefined && norm(app.requester) !== norm(want.requester)) return false;
    if (app.notes !== undefined && noteNorm(app.notes) !== noteNorm(want.notes)) return false;
    if (app.startTime !== undefined && want.startTime !== undefined && timeNorm(app.startTime) !== timeNorm(want.startTime)) return false;
    if (app.endTime !== undefined && want.endTime !== undefined && timeNorm(app.endTime) !== timeNorm(want.endTime)) return false;
    return true;
}

/** Strict: did the user change anything at all? (sameBooking ignores fields the app leaves out.) */
export function unchanged(before: Booking, after: Booking): boolean {
    return (
        before.placementId === after.placementId &&
        before.startDate === after.startDate &&
        before.endDate === after.endDate &&
        norm(before.campaignName) === norm(after.campaignName) &&
        norm(before.status) === norm(after.status) &&
        norm(before.requester) === norm(after.requester) &&
        noteNorm(before.notes) === noteNorm(after.notes) &&
        timeNorm(before.startTime || "00:00") === timeNorm(after.startTime || "00:00") &&
        timeNorm(before.endTime || "23:59") === timeNorm(after.endTime || "23:59")
    );
}

export function isConfirmed(p: PendingChange, app: Booking[]): boolean {
    if (p.kind === "create") return app.some((b) => !p.known?.has(b.id) && sameBooking(b, p.booking));
    const row = app.find((b) => b.id === p.id);
    if (p.kind === "delete") return !row || isReleased(row);
    // an updated row the app no longer lists (filtered out by its own formula) changed too
    return !row || sameBooking(row, p.booking);
}

/** The app's bookings with the unconfirmed changes applied, oldest first. */
export function overlay(app: Booking[], pending: PendingChange[]): Booking[] {
    let out = app;
    for (const p of pending) {
        if (p.kind === "delete") out = out.filter((b) => b.id !== p.id);
        else if (p.kind === "update") out = out.some((b) => b.id === p.id) ? out.map((b) => (b.id === p.id ? p.booking : b)) : [...out, p.booking];
        else out = [...out, p.booking];
    }
    return out;
}
