export interface Placement {
    /** PlacementId code when the dataset has one, otherwise the record id */
    id: string;
    /** record id, kept when it differs from `id` so bookings pointing at it still match */
    recordId?: string;
    name: string;
    dailyCapacity: number;
    status?: string;
}

export interface Booking {
    id: string;
    campaignName: string;
    placementId: string;
    /** yyyy-mm-dd, inclusive */
    startDate: string;
    /** yyyy-mm-dd, inclusive */
    endDate: string;
    startTime?: string;
    endTime?: string;
    requester?: string;
    status?: string;
    notes?: string;
}

export type DataSource = "Dataset" | "Json" | "Mock";
export type ViewKind = "Month" | "Week" | "Timeline" | "List";
export type KpiDensity = "Compact" | "Comfortable" | "Hidden";

export interface DataState {
    placements: Placement[];
    bookings: Booking[];
    mode: DataSource;
    signature: string;
    isLoading: boolean;
    /** ErrorMessage from the app: replaces the calendar */
    errorMessage?: string;
    /** bad PlacementsJson / BookingsJson: shown as a banner above the calendar */
    parseError?: string;
}

export interface CalendarConfig {
    allowCreate: boolean;
    allowEdit: boolean;
    allowDelete: boolean;
    allowDragDrop: boolean;
    weekStartsOn: 0 | 1;
    headerTitle: string;
    headerSubtitle: string;
    defaultView: ViewKind;
    focusDateKey: string;
    includeStatuses: string[];
    capacityStatuses: string[];
    kpiDensity: KpiDensity;
    currentUser: string;
    maskOtherBookings: boolean;
    width: number;
}

export type CalendarAction = "BookingSelected" | "BookingCreated" | "BookingUpdated" | "BookingDeleted" | "DateSelected";

export interface CalendarEvent {
    action: CalendarAction;
    bookingId?: string;
    placementId?: string;
    dateKey?: string;
    booking?: Booking;
    previous?: Booking;
}

export type Level = "empty" | "open" | "almost" | "full";

export interface CellStat {
    used: number;
    capacity: number;
    left: number;
    pct: number;
    level: Level;
    /** bookings that use up capacity on this day */
    counted: string[];
    /** bookings on this day that do not use capacity (pending, draft, …) */
    tentative: string[];
}
