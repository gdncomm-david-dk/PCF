/* Dates travel as yyyy-mm-dd keys and are only turned into local Date objects for arithmetic,
   so a booking never shifts a day because of the viewer's time zone. */

const KEY = /^(\d{4})-(\d{2})-(\d{2})/;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export function toKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
    const m = KEY.exec(key);
    if (!m) {
        const t = new Date();
        return new Date(t.getFullYear(), t.getMonth(), t.getDate());
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export const todayKey = (): string => toKey(new Date());

/** Accepts Date, yyyy-mm-dd (with or without a time part), epoch numbers and other parseable strings. */
export function normalizeDate(v: unknown): string | null {
    if (v === null || v === undefined || v === "") return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : toKey(v);
    if (typeof v === "string") {
        const s = v.trim();
        const m = KEY.exec(s);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : toKey(d);
    }
    if (typeof v === "number") {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : toKey(d);
    }
    return null;
}

export function addDays(key: string, n: number): string {
    const d = fromKey(key);
    return toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
}

export function diffDays(a: string, b: string): number {
    return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);
}

/** Inclusive list of day keys, capped so a bad end date cannot freeze the control. */
export function dayRange(start: string, end: string, cap = 400): string[] {
    const out: string[] = [];
    if (end < start) return out;
    let k = start;
    while (k <= end && out.length < cap) {
        out.push(k);
        k = addDays(k, 1);
    }
    return out;
}

export function startOfWeek(key: string, weekStartsOn: 0 | 1): string {
    const d = fromKey(key);
    const shift = (d.getDay() - weekStartsOn + 7) % 7;
    return addDays(key, -shift);
}

export function startOfMonth(key: string): string {
    const d = fromKey(key);
    return toKey(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(key: string): string {
    const d = fromKey(key);
    return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function addMonths(key: string, n: number): string {
    const d = fromKey(key);
    const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return toKey(new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last)));
}

export const weekday = (key: string): string => WEEKDAYS[fromKey(key).getDay()];
export const dayNum = (key: string): number => fromKey(key).getDate();
export const isWeekend = (key: string): boolean => {
    const g = fromKey(key).getDay();
    return g === 0 || g === 6;
};

/** 21 Sep */
export function shortDay(key: string): string {
    const d = fromKey(key);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Wed 23 Sep 2026 */
export function longDay(key: string): string {
    const d = fromKey(key);
    return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** 21–23 Sep · 30 Sep – 2 Oct · 5 Sep */
export function period(start: string, end: string): string {
    if (start === end) return shortDay(start);
    const a = fromKey(start);
    const b = fromKey(end);
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
    return `${shortDay(start)} – ${shortDay(end)}`;
}

/** 21 Sep – 4 Oct 2026 · September 2026 */
export function rangeTitle(start: string, end: string): string {
    const a = fromKey(start);
    const b = fromKey(end);
    if (start === startOfMonth(start) && end === endOfMonth(start)) return `${MONTHS_LONG[a.getMonth()]} ${a.getFullYear()}`;
    if (a.getFullYear() !== b.getFullYear()) return `${shortDay(start)} ${a.getFullYear()} – ${shortDay(end)} ${b.getFullYear()}`;
    return `${period(start, end)} ${b.getFullYear()}`;
}

export function dayCount(start: string, end: string): number {
    return Math.max(1, diffDays(start, end) + 1);
}
