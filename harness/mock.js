/* Mock PCF context + a JavaScript stand-in for the ApprovalScreen Power Fx handler.
   Column names are the SharePoint internal names of the [ULP] lists, so the control's
   default field mapping is exercised exactly as in the app. */
(function () {
    const d = (s) => new Date(s + "T00:00:00");
    const t = (s) => new Date(s);

    const db = {
        requests: [
            { RequestId: "ULP-412", Campaign: "Ramadan Teaser", RequestType: "Campaign", RequestedStartDate: d("2026-09-28"), RequestedEndDate: d("2026-09-30"), SubmittedBy: "Fitri Handayani", Approver: "rizky.adiputra@gdn-commerce.com; sarah.melinda@gdn-commerce.com", Status: "Pending" },
            { RequestId: "ULP-416", Campaign: "Tiket Rewards Spin Wheel", RequestType: "Campaign (Gamification)", RequestedStartDate: d("2026-10-01"), RequestedEndDate: d("2026-10-07"), SubmittedBy: "Yoga Tri", Approver: "sarah.melinda@gdn-commerce.com", Status: "Pending" },
            { RequestId: "ULP-418", Campaign: "BlibliMart Fresh Deals", RequestType: "Slot Comm", RequestedStartDate: d("2026-09-25"), RequestedEndDate: d("2026-09-27"), SubmittedBy: "Yoga Tri", Approver: "rizky.adiputra@gdn-commerce.com", Status: "Pending" },
            { RequestId: "ULP-421", Campaign: "Serba Seru Payday Boost", RequestType: "Slot Comm", RequestedStartDate: d("2026-09-30"), RequestedEndDate: d("2026-09-30"), SubmittedBy: "Anisa Rahma", Approver: "ilham.fauzi@gdn-commerce.com", Status: "Pending" },
            { RequestId: "ULP-405", Campaign: "Mom & Baby Fair", RequestType: "Slot Comm", RequestedStartDate: d("2026-09-20"), RequestedEndDate: d("2026-09-24"), SubmittedBy: "Dewi Lestari", Approver: "rizky.adiputra@gdn-commerce.com", Status: "Partial Approve" },
            { RequestId: "ULP-399", Campaign: "Newsletter Weekly Blast", RequestType: "Campaign", RequestedStartDate: d("2026-09-18"), RequestedEndDate: d("2026-09-24"), SubmittedBy: "Budi Santoso", Approver: "sarah.melinda@gdn-commerce.com", Status: "Approved" },
            { RequestId: "ULP-396", Campaign: "Gajian Sale Reminder", RequestType: "Slot Comm", RequestedStartDate: d("2026-09-25"), RequestedEndDate: d("2026-09-25"), SubmittedBy: "Anisa Rahma", Approver: "ilham.fauzi@gdn-commerce.com", Status: "Rejected" }
        ],
        items: [
            { ItemId: "ULP-412-ITEM-1", RequestId: "ULP-412", ItemName: "ULP Carousel", ItemType: "Placement", Status: "Pending", StartDate: d("2026-09-28"), EndDate: d("2026-09-30"), PlacementId: "ULP_CAROUSEL" },
            { ItemId: "ULP-412-ITEM-2", RequestId: "ULP-412", ItemName: "Push Notification Reminder", ItemType: "Placement", Status: "Pending", StartDate: d("2026-09-28"), EndDate: d("2026-09-28"), PlacementId: "PUSH_REMINDER" },
            { ItemId: "ULP-416-ITEM-1", RequestId: "ULP-416", ItemName: "Arcade Banner", ItemType: "Placement", Status: "Pending", StartDate: d("2026-10-01"), EndDate: d("2026-10-07"), PlacementId: "ARCADE_BANNER" },
            { ItemId: "ULP-416-ITEM-2", RequestId: "ULP-416", ItemName: "ULP Carousel", ItemType: "Placement", Status: "Pending", StartDate: d("2026-10-01"), EndDate: d("2026-10-07"), PlacementId: "ULP_CAROUSEL" },
            { ItemId: "ULP-416-ITEM-3", RequestId: "ULP-416", ItemName: "Push Notification Reminder", ItemType: "Placement", Status: "Pending", StartDate: d("2026-10-01"), EndDate: d("2026-10-01"), PlacementId: "PUSH_REMINDER" },
            { ItemId: "ULP-418-ITEM-1", RequestId: "ULP-418", ItemName: "Zona Cuan", ItemType: "Placement", Status: "Pending", StartDate: d("2026-09-25"), EndDate: d("2026-09-27"), PlacementId: "ZONA_CUAN" },
            { ItemId: "ULP-418-ITEM-2", RequestId: "ULP-418", ItemName: "ULP Carousel", ItemType: "Placement", Status: "Confirmed", StartDate: d("2026-09-25"), EndDate: d("2026-09-27"), PlacementId: "ULP_CAROUSEL" },
            { ItemId: "ULP-418-ITEM-3", RequestId: "ULP-418", ItemName: "Voucher Banner 1:1", ItemType: "Placement", Status: "Approved", StartDate: d("2026-09-25"), EndDate: d("2026-09-27"), PlacementId: "VOUCHER_1_1" },
            { ItemId: "ULP-418-ITEM-4", RequestId: "ULP-418", ItemName: "Highlight Carousel · App", ItemType: "Placement", Status: "Pending", StartDate: d("2026-09-26"), EndDate: d("2026-09-27"), PlacementId: "HL_CAROUSEL_APP" },
            { ItemId: "ULP-421-ITEM-1", RequestId: "ULP-421", ItemName: "Floating Icon", ItemType: "Placement", Status: "Pending", StartDate: d("2026-09-30"), EndDate: d("2026-09-30"), PlacementId: "FLOATING_ICON" },
            { ItemId: "ULP-405-ITEM-1", RequestId: "ULP-405", ItemName: "Zona Cuan", ItemType: "Placement", Status: "Approved", StartDate: d("2026-09-20"), EndDate: d("2026-09-24"), PlacementId: "ZONA_CUAN" },
            { ItemId: "ULP-405-ITEM-2", RequestId: "ULP-405", ItemName: "Voucher Banner 1:1", ItemType: "Placement", Status: "Approved with Changes", StartDate: d("2026-09-21"), EndDate: d("2026-09-24"), PlacementId: "VOUCHER_1_1" },
            { ItemId: "ULP-405-ITEM-3", RequestId: "ULP-405", ItemName: "Floating Icon", ItemType: "Placement", Status: "Rejected", StartDate: d("2026-09-20"), EndDate: d("2026-09-20"), PlacementId: "FLOATING_ICON" }
        ],
        history: [
            { HistoryId: "h1", RequestId: "ULP-418", ActionLabel: "Confirm 1 item(s): ULP-418-ITEM-2", Actor: "rizky.adiputra@gdn-commerce.com", Timestamp: t("2026-09-23T09:12:00"), Comment: "" },
            { HistoryId: "h2", RequestId: "ULP-418", ActionLabel: "Approve 1 item(s): ULP-418-ITEM-3", Actor: "rizky.adiputra@gdn-commerce.com", Timestamp: t("2026-09-23T09:14:00"), Comment: "Voucher slot still free on all three days." },
            { HistoryId: "h3", RequestId: "ULP-405", ActionLabel: "Reject 1 item(s): ULP-405-ITEM-3  ->  ticket Partial Approve", Actor: "rizky.adiputra@gdn-commerce.com", Timestamp: t("2026-09-19T15:40:00"), Comment: "Floating Icon is held by ULP-396 on the 20th." }
        ],
        comments: [
            { CommentId: "c1", RequestId: "ULP-418", Author: "rizky.adiputra@gdn-commerce.com", Timestamp: t("2026-09-23T09:14:00"), Text: "Voucher slot still free on all three days." },
            { CommentId: "c2", RequestId: "ULP-405", Author: "rizky.adiputra@gdn-commerce.com", Timestamp: t("2026-09-19T15:40:00"), Text: "Floating Icon is held by ULP-396 on the 20th." }
        ]
    };

    function dataset(rows, cols) {
        const columns = cols.map((c) => ({ name: c, displayName: c, alias: c, dataType: "SingleLine.Text", order: 0, visualSizeFactor: 1 }));
        const records = {};
        const ids = rows.map((r, i) => {
            const id = "rec" + i;
            records[id] = { getRecordId: () => id, getValue: (c) => r[c], getFormattedValue: (c) => String(r[c] ?? "") };
            return id;
        });
        return {
            loading: false, error: false, errorMessage: "", columns, records, sortedRecordIds: ids,
            paging: { hasNextPage: false, loadNextPage() {}, totalResultCount: ids.length },
            refresh() { log("refresh()"); setTimeout(render, 300); }
        };
    }

    const logEl = document.getElementById("log");
    function log(s) { logEl.textContent = new Date().toLocaleTimeString() + "  " + s + "\n" + logEl.textContent; }

    let availability = "";
    const params = () => ({
        title: { raw: "Approval Inbox" },
        subtitle: { raw: "Decide ULP slot requests — whole request or placement by placement." },
        showSearch: { raw: true }, showFilter: { raw: true }, showSummaryCards: { raw: true },
        IsProcessing: { raw: false },
        ApprovalConfigJson: { raw: "" },
        ItemAvailabilityJson: { raw: availability },
        requests: dataset(db.requests, ["RequestId", "Campaign", "RequestType", "RequestedStartDate", "RequestedEndDate", "SubmittedBy", "Approver", "Status"]),
        items: dataset(db.items, ["ItemId", "RequestId", "ItemName", "ItemType", "Status", "StartDate", "EndDate", "PlacementId"]),
        history: dataset(db.history, ["HistoryId", "RequestId", "ActionLabel", "Actor", "Timestamp", "Comment"]),
        comments: dataset(db.comments, ["CommentId", "RequestId", "Author", "Timestamp", "Text"])
    });
    const context = () => ({ parameters: params(), mode: { trackContainerResize() {} } });

    const control = new window.PowerAppsVibe.ULPApprovalManagement();
    let last = { ActionSequence: 0, ItemActionSequence: 0, PendingDateChangeItemId: "" };
    const me = "rizky.adiputra@gdn-commerce.com";
    const FINAL = ["Approved", "Confirmed", "Approved with Changes", "Rejected"];
    const cascadeType = (id) => {
        const r = db.requests.find((x) => x.RequestId === id);
        const k = (r && r.RequestType || "").trim().toLowerCase();
        return k === "campaign" || k === "campaign (gamification)";
    };

    function onOutput() {
        const o = control.getOutputs();
        if (o.PendingDateChangeItemId !== last.PendingDateChangeItemId && o.PendingDateChangeItemId) {
            // what the app's ItemAvailabilityJson formula computes for the pending item
            const it = db.items.find((i) => i.ItemId === o.PendingDateChangeItemId);
            setTimeout(() => {
                availability = JSON.stringify({ availableFrom: "2026-09-24", availableTo: "2026-10-15", freeDates: ["2026-09-28", "2026-09-29", "2026-10-01"] });
                log("ItemAvailabilityJson for " + (it && it.ItemId) + " = " + availability);
                render();
            }, 400);
        }
        if (o.ActionSequence !== last.ActionSequence) { log("REQUEST  #" + o.ActionSequence + "  " + o.ApprovalActionPayloadJson); setTimeout(() => handleRequest(JSON.parse(o.ApprovalActionPayloadJson)), 700); }
        if (o.ItemActionSequence !== last.ItemActionSequence) { log("ITEM     #" + o.ItemActionSequence + "  " + o.ItemActionPayloadJson); setTimeout(() => handleItems(JSON.parse(o.ItemActionPayloadJson)), 700); }
        if (o.OpenRequestId !== last.OpenRequestId) log("OpenRequestId = " + o.OpenRequestId);
        last = o;
    }

    function addHistory(id, label, comment) {
        db.history.push({ HistoryId: "h" + Math.random(), RequestId: id, ActionLabel: label, Actor: me, Timestamp: new Date(), Comment: comment || "" });
        if (comment) db.comments.push({ CommentId: "c" + Math.random(), RequestId: id, Author: me, Timestamp: new Date(), Text: comment });
    }

    // block A
    function handleRequest(p) {
        const id = p.requestId[0];
        const st = { APPROVE: "Approved", CONFIRM: "Confirmed", REJECT: "Rejected", REVISION: "Revision Required" }[p.action];
        const itemSt = { APPROVE: "Approved", REJECT: "Rejected" }[p.action];
        db.requests.filter((r) => r.RequestId === id).forEach((r) => (r.Status = st));
        if (cascadeType(id) && itemSt) db.items.filter((i) => i.RequestId === id).forEach((i) => (i.Status = itemSt));
        addHistory(id, { APPROVE: "Approve request", REJECT: "Reject request", REVISION: "Request revision", CONFIRM: "Confirm request" }[p.action] + (cascadeType(id) ? "  ->  cascaded to items and bookings" : ""), p.comment);
        render();
    }

    // block B + roll-up (items as the unit — the harness has no booking list)
    function handleItems(p) {
        const st = { APPROVE: "Approved", CONFIRM: "Confirmed", REJECT: "Rejected", APPROVE_CHANGE: "Approved with Changes" }[p.action];
        let reqId = "";
        db.items.filter((i) => p.itemId.indexOf(i.ItemId) !== -1).forEach((i) => {
            i.Status = st; reqId = i.RequestId;
            if (p.revisedStartDate) i.StartDate = d(p.revisedStartDate);
            if (p.revisedEndDate) i.EndDate = d(p.revisedEndDate);
        });
        const all = db.items.filter((i) => i.RequestId === reqId);
        const done = all.filter((i) => FINAL.indexOf(i.Status) !== -1).length;
        const rej = all.filter((i) => i.Status === "Rejected").length;
        let roll = "";
        if (all.length > 0 && done === all.length) {
            roll = rej === all.length ? "Rejected" : rej === 0 ? "Approved" : "Partial Approve";
            db.requests.filter((r) => r.RequestId === reqId).forEach((r) => (r.Status = roll));
        }
        addHistory(reqId, { APPROVE: "Approve", REJECT: "Reject", APPROVE_CHANGE: "Approve with changes", CONFIRM: "Confirm" }[p.action] + " " + p.itemId.length + " item(s): " + p.itemId.join(", ") + (roll ? "  ->  ticket " + roll : ""), p.comment);
        availability = "";
        render();
    }

    function render() { control.updateView(context()); }

    control.init(context(), () => setTimeout(onOutput, 0), {}, document.getElementById("host"));

    document.querySelectorAll("#bar [data-w]").forEach((b) =>
        b.addEventListener("click", () => document.getElementById("host").style.setProperty("--w", b.dataset.w))
    );
    window.__harness = { db, render };
})();
