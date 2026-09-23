import { CapacityIndex, CapacityRule } from "../lib/capacity";
import { Booking, CalendarConfig, Placement } from "../lib/types";

export interface Cell {
    placementId: string;
    day: string;
}

/** Everything a view needs to draw and to report interaction back to App. */
export interface ViewModel {
    config: CalendarConfig;
    rule: CapacityRule;
    index: CapacityIndex;
    placements: Placement[];
    placementsById: Map<string, Placement>;
    bookings: Booking[];
    bookingsById: Map<string, Booking>;
    days: string[];
    today: string;
    selected: Cell | null;
    selectedBookingId: string | null;
    canMoveBookings: boolean;
    onSelectCell: (placementId: string, day: string) => void;
    onSelectBooking: (id: string) => void;
    onCreate: (placementId: string, day: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    drag: DragApi;
}

export interface DragApi {
    draggingId: string | null;
    start: (id: string) => void;
    end: () => void;
    /** true = can drop, false = would overflow, null = not dragging */
    check: (placementId: string, day: string) => boolean | null;
    drop: (placementId: string, day: string) => void;
}
