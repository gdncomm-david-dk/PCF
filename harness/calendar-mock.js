/* Mock PCF context for MarketingSlotCalendar (a virtual control: updateView returns a React
   element that the harness renders). Columns use the [ULP] Placement Calendar / Booking Calendar
   names with the property-set aliases the screen binds, and the OnChange handler is simulated. */
(function () {
    const pad = (n) => (n < 10 ? "0" + n : "" + n);
    const key = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const today = new Date();
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    const day = (n) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + n);

    const q = new URLSearchParams(location.search);
    const role = q.get("role") || "ulp";
    const me = role === "requestor" ? "anisa.rahma@example.com" : "rizky.adiputra@example.com";

    const db = {
        placements: [
            ["FLOATING_ICON", "Floating Icon", 1], ["HL_CAROUSEL_APP", "Highlight Banner Carousel (App)", 1], ["HL_CAROUSEL_WEB", "Highlight Banner Carousel (Web)", 1],
            ["NEWSLETTER", "Newsletter", 1], ["ZONA_CUAN", "Zona Cuan", 6], ["ARCADE_BANNER", "Arcade Banner", 6], ["ULP_CAROUSEL", "ULP Carousel", 8],
            ["PUSH_REMINDER", "Push Notification Reminder", 3], ["VOUCHER_3_1", "Voucher Banner 3:1", 100], ["VOUCHER_1_1", "Voucher Banner 1:1", 100]
        ].map(([PlacementId, Title, DailyCapacity], i) => ({ ID: String(i + 1), PlacementId, Title, DailyCapacity, PlacementStatus: "Active" })),
        bookings: []
    };
    let seq = 0;
    const add = (Title, PlacementId, a, b, who, BookingStatus) =>
        db.bookings.push({ ID: String(++seq), Title, PlacementId, StartDate: day(a), EndDate: day(b), StartTime: "00:00", EndTime: "23:59", Requester: who + "@example.com", BookingStatus, Notes: "-" });
    add("Payday Floating Icon", "FLOATING_ICON", 0, 2, "anisa.rahma", "Confirmed");
    add("Serba Seru Payday", "FLOATING_ICON", 4, 6, "budi.santoso", "Confirmed");
    add("Ultah Blibli Countdown", "FLOATING_ICON", 7, 8, "dewi.lestari", "Confirmed");
    add("Gajian Sale Reminder", "FLOATING_ICON", 9, 9, "anisa.rahma", "Confirmed");
    add("Spin Wheel Teaser", "FLOATING_ICON", 9, 9, "yoga.tri", "Pending Approval");
    add("Gadget Week", "HL_CAROUSEL_APP", 0, 3, "fitri.handayani", "Confirmed");
    add("Beli Lokal Highlight", "HL_CAROUSEL_APP", 8, 10, "budi.santoso", "Confirmed");
    add("Fashion Fest", "HL_CAROUSEL_APP", 12, 13, "dewi.lestari", "Confirmed");
    add("Home Living Fair", "HL_CAROUSEL_WEB", 1, 4, "fitri.handayani", "Confirmed");
    add("Beauty Wishlist", "HL_CAROUSEL_WEB", 9, 11, "anisa.rahma", "Pending Approval");
    add("Newsletter Weekly Blast", "NEWSLETTER", 3, 3, "budi.santoso", "Confirmed");
    add("Gajian Newsletter", "NEWSLETTER", 9, 9, "anisa.rahma", "Confirmed");
    add("Old Promo", "NEWSLETTER", 5, 5, "budi.santoso", "Rejected");
    add("Mom & Baby Fair", "ZONA_CUAN", 2, 4, "dewi.lestari", "Confirmed");
    add("Zona Cuan Weekend", "ZONA_CUAN", 4, 6, "yoga.tri", "Confirmed");
    add("BlibliMart Fresh Deals", "ZONA_CUAN", 4, 6, "yoga.tri", "Pending Approval");
    add("Cashback Kilat", "ZONA_CUAN", 3, 5, "budi.santoso", "Confirmed");
    add("Flash Coupon", "ZONA_CUAN", 4, 5, "anisa.rahma", "Confirmed");
    add("Weekend Deals", "ZONA_CUAN", 4, 4, "fitri.handayani", "Confirmed");
    add("Arcade Bundle", "ARCADE_BANNER", 10, 13, "yoga.tri", "Confirmed");
    add("Tiket Rewards Spin Wheel", "ARCADE_BANNER", 10, 16, "yoga.tri", "Pending Approval");
    add("Arcade Daily Quest", "ARCADE_BANNER", 4, 6, "fitri.handayani", "Confirmed");
    add("BlibliMart Fresh Deals", "ULP_CAROUSEL", 4, 6, "yoga.tri", "Confirmed");
    add("Ramadan Teaser", "ULP_CAROUSEL", 7, 9, "fitri.handayani", "Pending Approval");
    add("Zona Cuan Weekend", "ULP_CAROUSEL", 5, 8, "yoga.tri", "Confirmed");
    add("Points Booster", "ULP_CAROUSEL", 0, 0, "dewi.lestari", "Confirmed");
    add("Ramadan Teaser", "PUSH_REMINDER", 7, 9, "fitri.handayani", "Pending Approval");
    add("Morning Deals Push", "PUSH_REMINDER", 0, 1, "anisa.rahma", "Confirmed");
    add("Flash Sale Warm-up", "PUSH_REMINDER", 1, 1, "budi.santoso", "Confirmed");
    add("Payday Push", "PUSH_REMINDER", 1, 1, "dewi.lestari", "Confirmed");
    add("Beli Lokal Highlight", "VOUCHER_3_1", 8, 10, "budi.santoso", "Confirmed");
    add("Mom & Baby Fair", "VOUCHER_1_1", 2, 4, "dewi.lestari", "Confirmed");
    add("BlibliMart Fresh Deals", "VOUCHER_1_1", 4, 6, "yoga.tri", "Confirmed");

    function dataset(rows, cols, idCol) {
        const columns = cols.map(([name, alias]) => ({ name, displayName: name, alias: alias || name, dataType: "SingleLine.Text", order: 0, visualSizeFactor: 1 }));
        const records = {};
        const ids = rows.map((r) => {
            const id = "rec-" + r[idCol];
            records[id] = { getRecordId: () => id, getValue: (c) => r[c], getFormattedValue: (c) => String(r[c] ?? "") };
            return id;
        });
        return { loading: false, error: false, columns, records, sortedRecordIds: ids, paging: { hasNextPage: false, loadNextPage() {}, totalResultCount: ids.length }, refresh() {} };
    }

    const logEl = document.getElementById("log");
    const log = (s) => (logEl.textContent = new Date().toLocaleTimeString() + "  " + s + "\n" + logEl.textContent);
    const host = document.getElementById("host");
    const editable = role === "ulp";

    const params = () => ({
        placements: dataset(db.placements, [["Title", "PlacementName"], ["DailyCapacity", "DailyCapacity"], ["PlacementStatus", "PlacementStatus"], ["PlacementId"]], "ID"),
        bookings: dataset(db.bookings, [["Title", "CampaignName"], ["PlacementId", "BookingPlacementId"], ["StartDate", "BookingStartDate"], ["EndDate", "BookingEndDate"], ["StartTime", "BookingStartTime"], ["EndTime", "BookingEndTime"], ["Requester", "Requester"], ["BookingStatus", "BookingStatus"], ["Notes", "Notes"]], "ID"),
        PlacementsJson: { raw: "" }, BookingsJson: { raw: "" },
        DataMode: { raw: q.get("mode") || "Auto" },
        IncludeStatuses: { raw: q.get("include") || "" },
        CapacityStatuses: { raw: q.has("cap") ? q.get("cap") : "Confirmed" },
        FocusDate: { raw: null },
        DefaultView: { raw: q.get("view") || "Month" },
        WeekStartsOn: { raw: "Monday" },
        AllowCreate: { raw: editable }, AllowEdit: { raw: editable }, AllowDelete: { raw: editable }, AllowDragDrop: { raw: editable },
        HeaderTitle: { raw: "Calendar" },
        HeaderSubtitle: { raw: role === "ulp" ? "Placement × day capacity · create, move and delete bookings" : role === "requestor" ? "Check availability before you submit · read-only" : "Airing dates for briefs in production · read-only" },
        KpiDensity: { raw: q.get("kpi") || "Compact" },
        IsLoading: { raw: q.get("loading") === "1" },
        ErrorMessage: { raw: q.get("error") || "" },
        CurrentUserEmail: { raw: me },
        MaskOtherBookings: { raw: role === "requestor" }
    });
    const context = () => ({ parameters: params(), mode: { trackContainerResize() {}, allocatedWidth: host.clientWidth, allocatedHeight: host.clientHeight } });

    const Ctor = window.DK.Components.MarketingSlotCalendar;
    const control = new Ctor();
    let lastCount = 0;
    const fromKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

    // what CalendarScreen's OnChange does with LastAction / LastActionPayload
    function onOutput() {
        const o = control.getOutputs();
        if (o.EventCount === lastCount) return;
        lastCount = o.EventCount;
        log(o.LastAction + "  #" + o.EventCount + "  " + o.LastActionPayload);
        const p = JSON.parse(o.LastActionPayload);
        const b = p.booking;
        const row = (x) => ({ Title: x.campaignName, PlacementId: x.placementId, StartDate: fromKey(x.startDate), EndDate: fromKey(x.endDate), StartTime: x.startTime, EndTime: x.endTime, Requester: x.requester, BookingStatus: x.status, Notes: x.notes || "-" });
        const recId = (id) => String(id).replace(/^rec-/, "");
        if (o.LastAction === "BookingCreated") db.bookings.push(Object.assign({ ID: String(++seq) }, row(b)));
        else if (o.LastAction === "BookingUpdated") db.bookings = db.bookings.map((r) => (r.ID === recId(b.id) ? Object.assign({ ID: r.ID }, row(b)) : r));
        else if (o.LastAction === "BookingDeleted") db.bookings = db.bookings.filter((r) => r.ID !== recId(p.bookingId));
        else return;
        setTimeout(render, 500); // the app re-reads the list
    }

    function render() { ReactDOM.render(control.updateView(context()), host); }
    control.init(context(), () => setTimeout(onOutput, 0), {});
    render();
    window.addEventListener("resize", render);
    document.querySelectorAll("#bar [data-w]").forEach((b) => b.addEventListener("click", () => { host.style.setProperty("--w", b.dataset.w); setTimeout(render, 30); }));
    window.__harness = { db, render, control };
})();
