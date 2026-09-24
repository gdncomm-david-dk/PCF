# MarketingSlotCalendar — Power Fx wiring

Ready-to-paste formulas for **CalendarScreen** (ULP Team: create, edit, move, delete) and
**CalendarScreenUser** (Requestor: read-only). They assume the following names. Rename them if yours differ.

| Thing | Name used here |
|---|---|
| Control on CalendarScreen | `MarketingSlotCalendar1` |
| Control on CalendarScreenUser | `MarketingSlotCalendarUser1` |
| Placement list | `'[ULP] Placement Calendar'` (Title, PlacementId, DailyCapacity, PlacementStatus) |
| Booking list | `'[ULP] Booking Calendar'` (Title, ItemID, TicketID, PlacementId, PlacementName, StartDate, EndDate, StartTime, EndTime, Requester, BookingStatus, Notes) |
| Collections | `colCalPlacements`, `colCalBookings` |

The formulas use en-US separators (`,` between arguments and `;` between statements). If your Studio uses
the Indonesian / European format, it converts them when you paste. If it does not, use `;` and `;;`.

The control is fed through **JSON** (`DataMode = "Json"`), with `id = Text(ID)`. That way every
`bookingId` in the payload is the SharePoint item ID, and `LookUp(..., ID = …)` finds the row directly.

---

## 1. Load the data — `CalendarScreen.OnVisible` (and `CalendarScreenUser.OnVisible`)

```powerfx
ClearCollect(colCalPlacements, '[ULP] Placement Calendar');
ClearCollect(
    colCalBookings,
    // delegable: keeps the pull small and recent; widen the window if you plan further back
    Filter('[ULP] Booking Calendar', EndDate >= DateAdd(Today(), -60, TimeUnit.Days))
);
// OnChange handles each action once; start from the control's current counter
Set(varCalEvent, MarketingSlotCalendar1.EventCount)
```

On CalendarScreenUser, use `MarketingSlotCalendarUser1.EventCount` in the last line.

---

## 2. Control properties

### CalendarScreen — `MarketingSlotCalendar1` (ULP Team)

| Property | Formula |
|---|---|
| DataMode | `"Json"` |
| PlacementsJson | see below |
| BookingsJson | see below |
| CapacityStatuses | `"Confirmed"` |
| IncludeStatuses | `""` — or `"Confirmed,Pending Approval"` to hide Rejected rows |
| AllowCreate / AllowEdit / AllowDelete / AllowDragDrop | `true` |
| CurrentUserEmail | `User().Email` |
| MaskOtherBookings | `false` |
| DefaultView | `"Month"` (Capacity), or `"Timeline"` |
| WeekStartsOn | `"Monday"` |
| HeaderTitle | `"Calendar"` |
| HeaderSubtitle | `"Placement × day capacity · create, move and delete bookings"` |

**PlacementsJson**

```powerfx
JSON(
    ForAll(
        colCalPlacements,
        {
            id: PlacementId,
            name: Title,
            dailyCapacity: DailyCapacity,
            status: PlacementStatus.Value
        }
    )
)
```

**BookingsJson**

```powerfx
JSON(
    ForAll(
        colCalBookings,
        {
            id: Text(ID),
            campaignName: Title,
            placementId: PlacementId,
            startDate: Text(StartDate, "yyyy-mm-dd"),
            endDate: Text(EndDate, "yyyy-mm-dd"),
            startTime: StartTime,
            endTime: EndTime,
            requester: Requester,
            status: BookingStatus.Value,
            notes: Notes,
            ticketId: TicketID
        }
    )
)
```

(`ticketId` is ignored by the control. It is there so the JSON matches the list, and you can drop it.)

### CalendarScreenUser — `MarketingSlotCalendarUser1` (Requestor)

Same `DataMode`, `PlacementsJson`, `BookingsJson` and `CapacityStatuses` as above, plus:

| Property | Formula |
|---|---|
| AllowCreate / AllowEdit / AllowDelete / AllowDragDrop | `false` |
| CurrentUserEmail | `User().Email` |
| MaskOtherBookings | `true` — other teams' bookings show as **Booked** only |
| HeaderSubtitle | `"Check availability before you submit · read-only"` |

---

## 3. `MarketingSlotCalendar1.OnChange` (ULP Team)

What it does:

- **BookingCreated** re-checks capacity against SharePoint (another user may have taken the slot since
  the screen loaded), then creates the row.
- **BookingUpdated** (edit dialog or drag) does the same re-check, not counting the booking itself,
  then updates the row.
- **BookingDeleted** removes the row.
- Bookings that belong to a request (`TicketID` filled) are left alone. Change them from the Approval
  screen, so that the request, its items and the booking stay in step.
- **DateSelected** and **BookingSelected** only remember the selection.
- After every write it reloads `colCalBookings`. The calendar then shows the saved state. If a write is
  refused, nothing reloads, and the calendar undoes its own optimistic change after 10 seconds.

```powerfx
If(
    Self.EventCount <> varCalEvent,
    Set(varCalEvent, Self.EventCount);
    With(
        { p: ParseJSON(Self.LastActionPayload) },
        With(
            {
                act: Text(p.action),
                // payload ids are Text(ID); ids of bookings still being saved look like "new-…"
                bid: IfError(Value(Text(p.bookingId)), 0),
                pid: Text(p.booking.placementId),
                nm: Trim(Text(p.booking.campaignName)),
                dStart: DateValue(Text(p.booking.startDate)),
                dEnd: DateValue(Text(p.booking.endDate)),
                st: Coalesce(Text(p.booking.startTime), "00:00"),
                et: Coalesce(Text(p.booking.endTime), "23:59"),
                req: Coalesce(Text(p.booking.requester), User().Email),
                stat: Coalesce(Text(p.booking.status), "Confirmed"),
                note: Coalesce(Text(p.booking.notes), "-")
            },
            With(
                {
                    row: If(bid > 0, LookUp('[ULP] Booking Calendar', ID = bid)),
                    cap: LookUp(colCalPlacements, PlacementId = pid, DailyCapacity),
                    pname: LookUp(colCalPlacements, PlacementId = pid, Title)
                },
                With(
                    {
                        // first day in the range that is already full on SharePoint (blank = all free);
                        // only checked when the booking itself takes a slot
                        fullDay: If(
                            act in ["BookingCreated", "BookingUpdated"] && stat = "Confirmed",
                            First(
                                Filter(
                                    ForAll(
                                        Sequence(DateDiff(dStart, dEnd, TimeUnit.Days) + 1, 0),
                                        With(
                                            { d: DateAdd(dStart, Value, TimeUnit.Days) },
                                            {
                                                day: d,
                                                used: CountRows(
                                                    Filter(
                                                        '[ULP] Booking Calendar',
                                                        PlacementId = pid,
                                                        BookingStatus.Value = "Confirmed",
                                                        StartDate <= d,
                                                        EndDate >= d
                                                    )
                                                ) - If(
                                                    // the booking being edited does not compete with itself
                                                    !IsBlank(row) && row.BookingStatus.Value = "Confirmed" &&
                                                    row.PlacementId = pid && row.StartDate <= d && row.EndDate >= d,
                                                    1,
                                                    0
                                                )
                                            }
                                        )
                                    ),
                                    used >= cap
                                )
                            ).day
                        )
                    },
                    Switch(
                        act,

                        "DateSelected",
                        Set(varCalPlacementId, Text(p.placementId));
                        Set(varCalDate, DateValue(Text(p.date))),

                        "BookingSelected",
                        Set(varCalPlacementId, Text(p.placementId));
                        Set(varCalDate, DateValue(Text(p.date)));
                        Set(varCalBookingId, bid),

                        "BookingCreated",
                        If(
                            IsBlank(cap),
                            Notify("Unknown placement " & pid & ".", NotificationType.Error),
                            !IsBlank(fullDay),
                            Notify(pname & " is already full on " & Text(fullDay, "dd mmm yyyy") & ". The booking was not saved.", NotificationType.Error),
                            IfError(
                                Patch(
                                    '[ULP] Booking Calendar',
                                    Defaults('[ULP] Booking Calendar'),
                                    {
                                        Title: nm,
                                        PlacementId: pid,
                                        PlacementName: pname,
                                        StartDate: dStart,
                                        EndDate: dEnd,
                                        StartTime: st,
                                        EndTime: et,
                                        Requester: req,
                                        BookingStatus: { Value: stat },
                                        Notes: note
                                    }
                                );
                                Notify("Booking created: " & nm & " on " & pname & ".", NotificationType.Success),
                                Notify("Could not create the booking: " & FirstError.Message, NotificationType.Error)
                            )
                        ),

                        "BookingUpdated",
                        If(
                            IsBlank(row),
                            Notify("That booking is still being saved or no longer exists. Try again in a moment.", NotificationType.Warning),
                            !IsBlank(row.TicketID),
                            Notify("This booking belongs to request " & row.TicketID & ". Change it from the Approval screen.", NotificationType.Warning),
                            IsBlank(cap),
                            Notify("Unknown placement " & pid & ".", NotificationType.Error),
                            !IsBlank(fullDay),
                            Notify(pname & " is already full on " & Text(fullDay, "dd mmm yyyy") & ". The change was not saved.", NotificationType.Error),
                            IfError(
                                Patch(
                                    '[ULP] Booking Calendar',
                                    row,
                                    {
                                        Title: nm,
                                        PlacementId: pid,
                                        PlacementName: pname,
                                        StartDate: dStart,
                                        EndDate: dEnd,
                                        StartTime: st,
                                        EndTime: et,
                                        Requester: req,
                                        BookingStatus: { Value: stat },
                                        Notes: note
                                    }
                                );
                                Notify("Booking updated: " & nm & ".", NotificationType.Success),
                                Notify("Could not update the booking: " & FirstError.Message, NotificationType.Error)
                            )
                        ),

                        "BookingDeleted",
                        If(
                            IsBlank(row),
                            Notify("That booking is still being saved or no longer exists.", NotificationType.Warning),
                            !IsBlank(row.TicketID),
                            Notify("This booking belongs to request " & row.TicketID & ". Reject or change it from the Approval screen.", NotificationType.Warning),
                            IfError(
                                Remove('[ULP] Booking Calendar', row);
                                // soft delete instead (keeps an audit trail), if the choice exists:
                                // Patch('[ULP] Booking Calendar', row, { BookingStatus: { Value: "Cancelled" } });
                                Notify("Booking deleted: " & row.Title & ".", NotificationType.Success),
                                Notify("Could not delete the booking: " & FirstError.Message, NotificationType.Error)
                            )
                        )
                    );
                    // reload after any write attempt so the calendar shows what SharePoint holds
                    If(
                        act in ["BookingCreated", "BookingUpdated", "BookingDeleted"],
                        ClearCollect(
                            colCalBookings,
                            Filter('[ULP] Booking Calendar', EndDate >= DateAdd(Today(), -60, TimeUnit.Days))
                        )
                    )
                )
            )
        )
    )
)
```

Notes:

- **`"Confirmed"` in the capacity check** must match `CapacityStatuses`. If you add more statuses that
  take a slot, change `stat = "Confirmed"` and `BookingStatus.Value = "Confirmed"` together.
- **Delegation warnings:** the capacity check filters SharePoint on PlacementId, BookingStatus and dates,
  and all of that is delegated. Only the `CountRows` of the already-filtered rows runs locally, which is
  fine for per-day counts. `ClearCollect(colCalPlacements, …)` pulls the whole placement list. That is OK
  for a list this small (under 500 / 2000 rows).
- **Choice values:** `BookingStatus` is a SharePoint Choice column, so it is written as `{ Value: stat }`.
  The status the user picks in the dialog must exist in the choice list, or the Patch fails with a clear
  message.
- **Request-linked rows** are protected. To allow editing them anyway, remove the two `!IsBlank(row.TicketID)`
  branches. Remember that the matching `[ULP] Request Items` row then keeps the old dates.

---

## 4. `MarketingSlotCalendarUser1.OnChange` (Requestor)

The requestor calendar is read-only, so only the selection matters. For example, it can pre-fill
SubmitRequest with the chosen placement and day:

```powerfx
If(
    Self.EventCount <> varCalEvent,
    Set(varCalEvent, Self.EventCount);
    With(
        { p: ParseJSON(Self.LastActionPayload) },
        If(
            Text(p.action) in ["DateSelected", "BookingSelected"],
            Set(varCalPlacementId, Text(p.placementId));
            Set(varCalDate, DateValue(Text(p.date)))
        )
    )
)
```

A "Request this slot" button next to the calendar can then do
`Navigate(SubmitRequest, ScreenTransition.None, { preselectPlacement: varCalPlacementId, preselectDate: varCalDate })`.

---

## Payload reference

`LastActionPayload` (the same shape as v1):

```json
{
  "action": "BookingUpdated",
  "bookingId": "42",
  "placementId": "FLOATING_ICON",
  "date": "2026-10-01",
  "booking":  { "id": "42", "campaignName": "Payday Floating Icon", "placementId": "FLOATING_ICON",
                "startDate": "2026-10-01", "endDate": "2026-10-03", "startTime": "00:00", "endTime": "23:59",
                "requester": "someone@company.com", "status": "Confirmed", "notes": "-" },
  "previous": { "…": "the booking before the change (BookingUpdated only)" }
}
```

| `action` | When | Has `booking` | Has `previous` |
|---|---|---|---|
| `DateSelected` | a day cell is clicked | – | – |
| `BookingSelected` | a booking is clicked | ✓ | – |
| `BookingCreated` | the New booking dialog is saved | ✓ (id `new-…`) | – |
| `BookingUpdated` | the Edit dialog is saved, or a booking is dragged | ✓ | ✓ |
| `BookingDeleted` | delete is confirmed | ✓ | – |
