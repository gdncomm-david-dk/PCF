import * as React from "react";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { App } from "./components/App";
import { normalizeDate, todayKey } from "./lib/dates";
import { resolveData, Resolved, splitList } from "./lib/data";
import { Booking, CalendarConfig, CalendarEvent, DataState, KpiDensity, ViewKind } from "./lib/types";

const EMPTY: IOutputs = {
    SelectedBookingId: "",
    SelectedPlacementId: "",
    SelectedDate: "",
    LastAction: "",
    LastActionPayload: "",
    EventCount: 0
};

/** Same shape as v1, so the screen's OnChange keeps parsing it unchanged. */
function bookingJson(b: Booking): Record<string, string> {
    const o: Record<string, string> = { id: b.id, campaignName: b.campaignName, placementId: b.placementId, startDate: b.startDate, endDate: b.endDate };
    if (b.startTime !== undefined) o.startTime = b.startTime;
    if (b.endTime !== undefined) o.endTime = b.endTime;
    if (b.requester !== undefined) o.requester = b.requester;
    if (b.status !== undefined) o.status = b.status;
    if (b.notes !== undefined) o.notes = b.notes;
    return o;
}

function payload(e: CalendarEvent): string {
    const o: Record<string, unknown> = { action: e.action };
    if (e.bookingId !== undefined) o.bookingId = e.bookingId;
    if (e.placementId !== undefined) o.placementId = e.placementId;
    if (e.dateKey !== undefined) o.date = e.dateKey;
    if (e.booking) o.booking = bookingJson(e.booking);
    if (e.previous) o.previous = bookingJson(e.previous);
    try {
        return JSON.stringify(o);
    } catch {
        return `{"action":"${e.action}"}`;
    }
}

const blank = (v: string | null | undefined): string | undefined => (v === null || v === undefined || v.trim() === "" ? undefined : v);

export class MarketingSlotCalendar implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void = () => undefined;
    private outputs: IOutputs = { ...EMPTY };
    private cache: Resolved | null = null;

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void): void {
        this.notifyOutputChanged = notifyOutputChanged;
        context.mode.trackContainerResize(true);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.loadMore(context);
        const p = context.parameters;
        const width = context.mode.allocatedWidth;
        const height = context.mode.allocatedHeight;
        const config: CalendarConfig = {
            allowCreate: p.AllowCreate.raw !== false,
            allowEdit: p.AllowEdit.raw !== false,
            allowDelete: p.AllowDelete.raw !== false,
            allowDragDrop: p.AllowDragDrop.raw !== false,
            weekStartsOn: p.WeekStartsOn.raw === "Sunday" ? 0 : 1,
            headerTitle: blank(p.HeaderTitle.raw) ?? "Marketing Slot Management",
            headerSubtitle: blank(p.HeaderSubtitle.raw) ?? "Manage campaign placements & daily availability",
            defaultView: (p.DefaultView.raw as ViewKind | null) ?? "Month",
            focusDateKey: normalizeDate(p.FocusDate.raw) ?? todayKey(),
            includeStatuses: splitList(p.IncludeStatuses.raw),
            capacityStatuses: splitList(p.CapacityStatuses?.raw),
            kpiDensity: (p.KpiDensity.raw as KpiDensity | null) ?? "Compact",
            currentUser: (p.CurrentUserEmail?.raw ?? "").trim().toLowerCase(),
            maskOtherBookings: p.MaskOtherBookings?.raw === true,
            width: width > 0 ? width : 1200
        };
        return React.createElement(
            "div",
            {
                className: "msc-host",
                style: {
                    width: width > 0 ? `${width}px` : "100%",
                    height: height > 0 ? `${height}px` : "100%",
                    minHeight: "480px"
                }
            },
            React.createElement(App, { data: this.data(context), config, onEvent: this.handleEvent })
        );
    }

    public getOutputs(): IOutputs {
        return this.outputs;
    }

    public destroy(): void {
        this.cache = null;
    }

    private handleEvent = (e: CalendarEvent): void => {
        this.outputs = {
            SelectedBookingId: e.bookingId ?? "",
            SelectedPlacementId: e.placementId ?? "",
            SelectedDate: e.dateKey ?? "",
            LastAction: e.action,
            LastActionPayload: payload(e),
            EventCount: (this.outputs.EventCount ?? 0) + 1
        };
        this.notifyOutputChanged();
    };

    private data(context: ComponentFramework.Context<IInputs>): DataState {
        const p = context.parameters;
        const r = resolveData({
            setting: p.DataMode.raw ?? "Auto",
            placementsDataset: p.placements,
            bookingsDataset: p.bookings,
            placementsJson: p.PlacementsJson.raw,
            bookingsJson: p.BookingsJson.raw
        });
        // keep the previous arrays while nothing changed, so memoised views do not recompute
        if (this.cache === null || this.cache.signature !== r.signature) this.cache = r;
        return {
            placements: this.cache.placements,
            bookings: this.cache.bookings,
            mode: this.cache.mode,
            signature: this.cache.signature,
            isLoading: p.IsLoading.raw === true || p.placements?.loading === true,
            errorMessage: blank(p.ErrorMessage.raw),
            parseError: r.parseError
        };
    }

    private loadMore(context: ComponentFramework.Context<IInputs>): void {
        for (const ds of [context.parameters.placements, context.parameters.bookings]) {
            if (ds && !ds.loading && ds.paging?.hasNextPage && ds.sortedRecordIds.length < 2000) ds.paging.loadNextPage();
        }
    }
}
