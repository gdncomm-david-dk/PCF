const valid = (d?: Date): d is Date => !!d && !Number.isNaN(d.getTime()) && d.getTime() !== 0;

export function shortDate(d?: Date): string {
    if (!valid(d)) return "—";
    try {
        return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch {
        return "—";
    }
}

export function period(start?: Date, end?: Date): string {
    if (!valid(start) && !valid(end)) return "—";
    if (valid(start) && valid(end)) {
        const sameYear = start.getFullYear() === end.getFullYear();
        const s = shortDate(start);
        const e = shortDate(end);
        const y = sameYear ? ` ${end.getFullYear()}` : "";
        return s === e ? `${s}${y}` : `${s} – ${e}${y}`;
    }
    return valid(start) ? `from ${shortDate(start)}` : `until ${shortDate(end)}`;
}

/** Inclusive day count. */
export function days(start?: Date, end?: Date): number | undefined {
    if (!valid(start) || !valid(end)) return undefined;
    const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.round((b - a) / 86400000) + 1;
}

export function dateTime(d?: Date): string {
    if (!valid(d)) return "—";
    try {
        return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
        return "—";
    }
}

export function relative(d?: Date, now: Date = new Date()): string {
    if (!valid(d)) return "";
    const mins = Math.round((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const dd = Math.round(hours / 24);
    if (dd < 30) return `${dd} d ago`;
    return shortDate(d);
}

/** yyyy-mm-dd in local time — what <input type="date"> reads and writes. */
export function isoDay(d?: Date): string {
    if (!valid(d)) return "";
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

export function fromIsoDay(s: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    const d = new Date(`${s}T00:00:00`);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

export function longDay(s: string): string {
    const d = fromIsoDay(s);
    if (!d) return s;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "fitri.handayani@x.com" -> "Fitri Handayani"; names pass through. */
export function displayName(s?: string): string {
    if (!s) return "";
    const t = s.trim();
    if (t.indexOf("@") === -1) return t;
    return t
        .split("@")[0]
        .split(/[._-]+/)
        .filter((x) => x.length > 0)
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join(" ");
}

export function initials(s?: string): string {
    const n = displayName(s);
    if (!n) return "?";
    const parts = n.split(/\s+/).filter((x) => x.length > 0);
    const a = parts[0]?.charAt(0) ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1].charAt(0) : parts[0]?.charAt(1) ?? "";
    return (a + b).toUpperCase() || "?";
}

const AVATAR_TONES = ["blue", "tosca", "green", "orange", "magenta", "lightblue"];
export function avatarTone(s?: string): string {
    const n = (s ?? "").toLowerCase();
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
}

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
