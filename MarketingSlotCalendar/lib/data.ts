/* Reads placements and bookings from the bound datasets, the JSON properties or the built-in
   sample, with the same precedence and column matching as v1 so an existing screen keeps working. */
import { normalizeDate } from "./dates";
import { mockBookings, mockPlacements } from "./mock";
import { Booking, DataSource, Placement } from "./types";

type DataSet = ComponentFramework.PropertyTypes.DataSet;
type Row = Record<string, unknown>;

const PLACEMENT_NAME = ["name", "title", "placementname", "placement", "cr_name"];
const DAILY_CAPACITY = ["dailycapacity", "capacity", "maxbookings", "slots", "dailyslots"];
const PLACEMENT_STATUS = ["status", "statuscode", "state", "placementstatus"];
const PLACEMENT_CODE = ["placementid", "placementcode", "placementkey"];
const CAMPAIGN = ["campaignname", "campaign", "name", "title", "subject"];
const BOOKING_PLACEMENT = ["placementid", "placement", "placementref", "bannerplacement"];
const START = ["startdate", "start", "datefrom", "fromdate", "begindate"];
const END = ["enddate", "end", "dateto", "todate", "finishdate"];
const START_TIME = ["starttime", "timefrom", "fromtime"];
const END_TIME = ["endtime", "timeto", "totime"];
const REQUESTER = ["requester", "requestedby", "owner", "createdby", "requestor"];
const BOOKING_STATUS = ["status", "statuscode", "bookingstatus", "state"];
const NOTES = ["notes", "description", "comments", "remarks"];

const squash = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
const isObject = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);

/** Text out of whatever a canvas column hands us, including person / lookup / choice records. */
export function text(v: unknown): string | undefined {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string") {
        const t = v.trim();
        return t === "" ? undefined : t;
    }
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (v instanceof Date) return v.toISOString();
    if (isObject(v)) {
        for (const k of ["id", "Id", "name", "Value", "DisplayName", "displayName", "Email", "value"]) {
            const x = v[k];
            if (typeof x === "string" && x.trim() !== "") return x.trim();
        }
    }
    return undefined;
}

function whole(v: unknown, fallback: number): number {
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v));
    if (typeof v === "string") {
        const n = Number(v.trim());
        if (v.trim() !== "" && Number.isFinite(n)) return Math.max(0, Math.round(n));
    }
    return fallback;
}

/** 9:5 -> 09:05; anything that is not h:mm is kept as typed */
function time(v: string | undefined): string | undefined {
    if (v === undefined) return undefined;
    const m = /^(\d{1,2}):(\d{2})/.exec(v);
    if (!m) return v;
    const h = Math.min(23, Number(m[1]));
    const mm = Math.min(59, Number(m[2]));
    return `${h < 10 ? "0" : ""}${h}:${mm < 10 ? "0" : ""}${mm}`;
}

function pick(row: Row, keys: string[]): unknown {
    for (const k of keys) if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
    const map = new Map<string, unknown>();
    for (const k of Object.keys(row)) map.set(squash(k), row[k]);
    for (const k of keys) {
        const v = map.get(squash(k));
        if (v !== undefined) return v;
    }
    return undefined;
}

/** The bound property-set column wins; otherwise the first column whose name looks right. */
function column(ds: DataSet, propertySet: string, candidates: string[]): string | undefined {
    for (const c of ds.columns) if (c.alias === propertySet || c.name === propertySet) return c.name;
    for (const cand of candidates) {
        for (const c of ds.columns) {
            const n = squash(c.name);
            const d = squash(c.displayName || "");
            if (n === cand || d === cand || n.endsWith(cand)) return c.name;
        }
    }
    return undefined;
}

function value(rec: ComponentFramework.PropertyHelper.DataSetApi.EntityRecord, col: string | undefined): unknown {
    if (col === undefined) return undefined;
    try {
        return rec.getValue(col);
    } catch {
        return undefined;
    }
}

const hasRows = (ds: DataSet | undefined): ds is DataSet => ds !== undefined && !ds.loading && ds.sortedRecordIds.length > 0;

function readPlacementSet(ds: DataSet): Placement[] {
    const name = column(ds, "PlacementName", PLACEMENT_NAME);
    const cap = column(ds, "DailyCapacity", DAILY_CAPACITY);
    const status = column(ds, "PlacementStatus", PLACEMENT_STATUS);
    // [ULP] Booking Calendar refers to placements by their PlacementId code, not the record id
    const code = column(ds, "PlacementId", PLACEMENT_CODE);
    const out: Placement[] = [];
    for (const id of ds.sortedRecordIds) {
        const r = ds.records[id];
        if (!r) continue;
        const recordId = r.getRecordId();
        const key = text(value(r, code));
        out.push({
            id: key ?? recordId,
            recordId: key && key !== recordId ? recordId : undefined,
            name: text(value(r, name)) ?? `Placement ${out.length + 1}`,
            dailyCapacity: whole(value(r, cap), 1),
            status: text(value(r, status))
        });
    }
    return out;
}

function readBookingSet(ds: DataSet): Booking[] {
    const c = {
        campaign: column(ds, "CampaignName", CAMPAIGN),
        placement: column(ds, "BookingPlacementId", BOOKING_PLACEMENT),
        start: column(ds, "BookingStartDate", START),
        end: column(ds, "BookingEndDate", END),
        startTime: column(ds, "BookingStartTime", START_TIME),
        endTime: column(ds, "BookingEndTime", END_TIME),
        requester: column(ds, "Requester", REQUESTER),
        status: column(ds, "BookingStatus", BOOKING_STATUS),
        notes: column(ds, "Notes", NOTES)
    };
    const out: Booking[] = [];
    for (const id of ds.sortedRecordIds) {
        const r = ds.records[id];
        if (!r) continue;
        const placementId = text(value(r, c.placement));
        const start = normalizeDate(value(r, c.start));
        if (placementId === undefined || start === null) continue;
        const end = normalizeDate(value(r, c.end)) ?? start;
        out.push({
            id: r.getRecordId(),
            campaignName: text(value(r, c.campaign)) ?? "Untitled campaign",
            placementId,
            startDate: start,
            endDate: end < start ? start : end,
            startTime: time(text(value(r, c.startTime))),
            endTime: time(text(value(r, c.endTime))),
            requester: text(value(r, c.requester)),
            status: text(value(r, c.status)),
            notes: text(value(r, c.notes))
        });
    }
    return out;
}

function parseRows(raw: string | null): { rows: Row[]; error?: string } {
    if (raw === null || raw.trim() === "") return { rows: [] };
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { rows: [], error: "The JSON could not be parsed. Check for a trailing comma or a missing bracket." };
    }
    return Array.isArray(parsed) ? { rows: parsed.filter(isObject) } : { rows: [], error: "The JSON must be an array of objects." };
}

function placementsFromJson(raw: string | null): { placements: Placement[]; error?: string } {
    const { rows, error } = parseRows(raw);
    if (error) return { placements: [], error };
    return {
        placements: rows.map((r, i) => ({
            id: text(pick(r, ["id", "placementId", "key", "value"])) ?? `placement-${i + 1}`,
            name: text(pick(r, ["name", "placementName", "title", "label"])) ?? `Placement ${i + 1}`,
            dailyCapacity: whole(pick(r, ["dailyCapacity", "capacity", "maxBookings", "slots"]), 1),
            status: text(pick(r, ["status", "state"]))
        }))
    };
}

function bookingsFromJson(raw: string | null): { bookings: Booking[]; error?: string } {
    const { rows, error } = parseRows(raw);
    if (error) return { bookings: [], error };
    const out: Booking[] = [];
    rows.forEach((r, i) => {
        const placementId = text(pick(r, ["placementId", "placement", "placementRef"]));
        const start = normalizeDate(pick(r, ["startDate", "start", "dateFrom", "from"]));
        if (placementId === undefined || start === null) return;
        const end = normalizeDate(pick(r, ["endDate", "end", "dateTo", "to"])) ?? start;
        out.push({
            id: text(pick(r, ["id", "bookingId", "key"])) ?? `booking-${i + 1}`,
            campaignName: text(pick(r, ["campaignName", "campaign", "name", "title"])) ?? "Untitled campaign",
            placementId,
            startDate: start,
            endDate: end < start ? start : end,
            startTime: time(text(pick(r, ["startTime", "timeFrom"]))),
            endTime: time(text(pick(r, ["endTime", "timeTo"]))),
            requester: text(pick(r, ["requester", "requestedBy", "owner"])),
            status: text(pick(r, ["status", "state"])),
            notes: text(pick(r, ["notes", "description", "comments"]))
        });
    });
    return { bookings: out };
}

/** FNV-1a over everything that can change what is drawn */
function signature(mode: string, placements: Placement[], bookings: Booking[]): string {
    let h = 2166136261;
    const add = (s: string) => {
        for (let i = 0; i < s.length; i += 1) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h ^= 31;
    };
    add(`P${placements.length}`);
    for (const p of placements) [p.id, p.name, String(p.dailyCapacity), p.status ?? ""].forEach(add);
    add(`B${bookings.length}`);
    for (const b of bookings)
        [b.id, b.placementId, b.campaignName, b.startDate, b.endDate, b.status ?? "", b.startTime ?? "", b.endTime ?? "", b.requester ?? "", b.notes ?? ""].forEach(add);
    return `${mode}:${(h >>> 0).toString(16)}`;
}

export interface Resolved {
    placements: Placement[];
    bookings: Booking[];
    mode: DataSource;
    signature: string;
    parseError?: string;
}

export interface Sources {
    setting: string;
    placementsDataset?: DataSet;
    bookingsDataset?: DataSet;
    placementsJson: string | null;
    bookingsJson: string | null;
}

const done = (placements: Placement[], bookings: Booking[], mode: DataSource, parseError?: string): Resolved => ({
    placements,
    bookings,
    mode,
    signature: signature(mode, placements, bookings),
    parseError
});

/** Auto: datasets, then JSON, then the sample. Dataset / Json: that source only. Mock: the sample. */
export function resolveData(src: Sources): Resolved {
    const { setting } = src;
    if (setting === "Mock") return done(mockPlacements(), mockBookings(), "Mock");
    const jsonAllowed = setting === "Auto" || setting === "Json";
    let placements: Placement[] = [];
    let bookings: Booking[] = [];
    let mode: DataSource = "Mock";
    let parseError: string | undefined;

    if ((setting === "Auto" || setting === "Dataset") && hasRows(src.placementsDataset)) {
        placements = readPlacementSet(src.placementsDataset);
        mode = "Dataset";
        if (hasRows(src.bookingsDataset)) bookings = readBookingSet(src.bookingsDataset);
    }
    if (placements.length === 0 && jsonAllowed) {
        const p = placementsFromJson(src.placementsJson);
        if (p.error) parseError = `Placements JSON: ${p.error}`;
        if (p.placements.length > 0) {
            placements = p.placements;
            mode = "Json";
            const b = bookingsFromJson(src.bookingsJson);
            if (b.error) parseError = `Bookings JSON: ${b.error}`;
            bookings = b.bookings;
        }
    }
    // placements from the dataset, bookings handed over as JSON
    if (mode === "Dataset" && bookings.length === 0 && jsonAllowed) {
        const b = bookingsFromJson(src.bookingsJson);
        if (b.bookings.length > 0) bookings = b.bookings;
    }
    if (placements.some((p) => p.recordId)) {
        // bookings that still point at the record id are moved onto the placement code
        const alias = new Map(placements.filter((p) => p.recordId).map((p) => [p.recordId as string, p.id]));
        bookings = bookings.map((b) => (alias.has(b.placementId) ? { ...b, placementId: alias.get(b.placementId) as string } : b));
    }
    if (placements.length === 0) {
        if (setting === "Auto") return done(mockPlacements(), mockBookings(), "Mock", parseError);
        return done([], [], setting === "Json" ? "Json" : "Dataset", parseError);
    }
    return done(placements, bookings, mode, parseError);
}

export function splitList(raw: string | null | undefined): string[] {
    if (!raw) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of raw.split(/[,;\n]/)) {
        const t = part.trim();
        if (t === "" || seen.has(t.toLowerCase())) continue;
        seen.add(t.toLowerCase());
        out.push(t);
    }
    return out;
}
