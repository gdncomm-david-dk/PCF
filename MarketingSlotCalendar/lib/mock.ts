/* Built-in sample, shown in Mock mode or in Auto mode when nothing is bound, so the screen can be
   designed before the lists are wired. Dates are relative to the current week. */
import { addDays, startOfWeek, todayKey } from "./dates";
import { Booking, Placement } from "./types";

const PLACEMENTS: Placement[] = [
    { id: "FLOATING_ICON", name: "Floating Icon", dailyCapacity: 1, status: "Active" },
    { id: "HL_CAROUSEL_APP", name: "Highlight Banner Carousel (App)", dailyCapacity: 1, status: "Active" },
    { id: "HL_CAROUSEL_WEB", name: "Highlight Banner Carousel (Web)", dailyCapacity: 1, status: "Active" },
    { id: "NEWSLETTER", name: "Newsletter", dailyCapacity: 1, status: "Active" },
    { id: "ZONA_CUAN", name: "Zona Cuan", dailyCapacity: 6, status: "Active" },
    { id: "ARCADE_BANNER", name: "Arcade Banner", dailyCapacity: 6, status: "Active" },
    { id: "ULP_CAROUSEL", name: "ULP Carousel", dailyCapacity: 8, status: "Active" },
    { id: "PUSH_REMINDER", name: "Push Notification Reminder", dailyCapacity: 3, status: "Active" },
    { id: "VOUCHER_3_1", name: "Voucher Banner 3:1", dailyCapacity: 20, status: "Active" },
    { id: "VOUCHER_1_1", name: "Voucher Banner 1:1", dailyCapacity: 20, status: "Active" }
];

// campaign, placement, first day, last day (offsets from this week's Monday), requester, status
type Row = [string, string, number, number, string, string];
const ROWS: Row[] = [
    ["Payday Floating Icon", "FLOATING_ICON", 0, 2, "Anisa Rahma", "Confirmed"],
    ["Serba Seru Payday", "FLOATING_ICON", 4, 6, "Budi Santoso", "Confirmed"],
    ["Ultah Blibli Countdown", "FLOATING_ICON", 7, 8, "Dewi Lestari", "Confirmed"],
    ["Gajian Sale Reminder", "FLOATING_ICON", 9, 9, "Anisa Rahma", "Confirmed"],
    ["Spin Wheel Teaser", "FLOATING_ICON", 9, 9, "Yoga Tri", "Pending Approval"],
    ["Gadget Week", "HL_CAROUSEL_APP", 0, 3, "Fitri Handayani", "Confirmed"],
    ["Beli Lokal Highlight", "HL_CAROUSEL_APP", 8, 10, "Budi Santoso", "Confirmed"],
    ["Fashion Fest", "HL_CAROUSEL_APP", 12, 13, "Dewi Lestari", "Confirmed"],
    ["Home Living Fair", "HL_CAROUSEL_WEB", 1, 4, "Fitri Handayani", "Confirmed"],
    ["Beauty Wishlist", "HL_CAROUSEL_WEB", 9, 11, "Anisa Rahma", "Pending Approval"],
    ["Newsletter Weekly Blast", "NEWSLETTER", 3, 3, "Budi Santoso", "Confirmed"],
    ["Gajian Newsletter", "NEWSLETTER", 9, 9, "Anisa Rahma", "Confirmed"],
    ["Mom & Baby Fair", "ZONA_CUAN", 2, 4, "Dewi Lestari", "Confirmed"],
    ["Zona Cuan Weekend", "ZONA_CUAN", 4, 6, "Yoga Tri", "Confirmed"],
    ["BlibliMart Fresh Deals", "ZONA_CUAN", 4, 6, "Yoga Tri", "Pending Approval"],
    ["Cashback Kilat", "ZONA_CUAN", 3, 5, "Budi Santoso", "Confirmed"],
    ["Arcade Bundle Oct", "ARCADE_BANNER", 10, 13, "Yoga Tri", "Confirmed"],
    ["Tiket Rewards Spin Wheel", "ARCADE_BANNER", 10, 16, "Yoga Tri", "Pending Approval"],
    ["Arcade Daily Quest", "ARCADE_BANNER", 4, 6, "Fitri Handayani", "Confirmed"],
    ["BlibliMart Fresh Deals", "ULP_CAROUSEL", 4, 6, "Yoga Tri", "Confirmed"],
    ["Ramadan Teaser", "ULP_CAROUSEL", 7, 9, "Fitri Handayani", "Pending Approval"],
    ["Zona Cuan Weekend", "ULP_CAROUSEL", 5, 8, "Yoga Tri", "Confirmed"],
    ["Points Booster", "ULP_CAROUSEL", 0, 0, "Dewi Lestari", "Confirmed"],
    ["Ramadan Teaser", "PUSH_REMINDER", 7, 9, "Fitri Handayani", "Pending Approval"],
    ["Morning Deals Push", "PUSH_REMINDER", 0, 1, "Anisa Rahma", "Confirmed"],
    ["Flash Sale 12.12 Warm-up", "PUSH_REMINDER", 1, 1, "Budi Santoso", "Confirmed"],
    ["Beli Lokal Highlight", "VOUCHER_3_1", 8, 10, "Budi Santoso", "Confirmed"],
    ["Mom & Baby Fair", "VOUCHER_1_1", 2, 4, "Dewi Lestari", "Confirmed"],
    ["BlibliMart Fresh Deals", "VOUCHER_1_1", 4, 6, "Yoga Tri", "Confirmed"],
    ["Old Promo (cancelled)", "NEWSLETTER", 5, 5, "Budi Santoso", "Cancelled"]
];

export const mockPlacements = (): Placement[] => PLACEMENTS.map((p) => ({ ...p }));

export function mockBookings(): Booking[] {
    const monday = startOfWeek(todayKey(), 1);
    return ROWS.map(([campaignName, placementId, a, b, requester, status], i) => ({
        id: `mock-${String(i + 1).padStart(3, "0")}`,
        campaignName,
        placementId,
        startDate: addDays(monday, a),
        endDate: addDays(monday, b),
        startTime: "00:00",
        endTime: "23:59",
        requester,
        status,
        notes: status === "Pending Approval" ? "Waiting for ULP Team approval." : "-"
    }));
}
