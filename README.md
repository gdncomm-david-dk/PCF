# ULP Approval Management — PCF control v2

Source for the `PowerAppsVibe.ULPApprovalManagement` code component used on **ApprovalScreen** in the
ULP Hub canvas app. v2 redesigns the UI in the Blibli (Blu Basic) look of the ULP Hub dashboard mockups
and makes **item-level (per-placement) approval** the centre of the detail pane. Campaign types keep a
whole-request decision bar on top of it.

**The output contract is unchanged.** The ApprovalScreen `OnChange` handler (blocks A, B and C) works
as it is: same namespace, constructor, properties, payload shapes and sequence counters.

![Item-level decisions](docs/screenshots/01-item-level.png)

## What changed for the approver

| Area | 1.x | 2.0 |
|---|---|---|
| Inbox | table plus a bulk request action bar | request cards (avatar, type chip, period, item progress), tabs **Needs action / Decided / All**, KPI strip, search, filter panel |
| Request decision | bulk bar in the inbox (the handler processed only the first id) | **Whole request** bar in the detail pane, for `requestLevelTypes` only (default Campaign, Campaign (Gamification)), with the cascade spelled out in the confirm dialog |
| Item decision | Items tab: a table plus a dropdown bulk bar | every item row has its own **Approve / Reject / Approve with changes** buttons, plus multi-select with a floating bulk bar and filters **All / Pending / Decided**. A decided item collapses to *Change decision* |
| Approve with changes | two date pickers | requested → revised comparison, availability window, optional *Nearest free* chips, dates pre-filled from the item |
| Progress | none | "x of n items decided" with a segmented bar (approved / with changes / rejected / pending) |
| History / Comments | plain lists | Activity timeline coloured by action, and Comments as a chat thread |
| Feedback | dialogs waited on `IsProcessing` | dialogs close on confirm. Affected rows show *Updating* until the lists report the new status (or 20 s pass), and a toast confirms the send |
| Refresh | refreshed `requests` only | refreshes requests, items, history and comments |
| Layout | — | desktop split view; tablet and mobile show the detail full-width with sticky tabs and decision bar |

| Bulk select | Approve with changes | Whole request (Campaign) | Mobile |
|---|---|---|---|
| ![](docs/screenshots/02-bulk-select.png) | ![](docs/screenshots/03-approve-with-changes.png) | ![](docs/screenshots/04-request-level.png) | ![](docs/screenshots/05-mobile.png) |

## Output contract (unchanged)

| Output | When it changes | Value |
|---|---|---|
| `ActionSequence` / `ApprovalActionPayloadJson` | whole-request decision confirmed | `{"action":"APPROVE","requestId":["ULP-412"],"comment":"…"}`. `requestId` always holds exactly the open request. `comment` is present only when typed |
| `ItemActionSequence` / `ItemActionPayloadJson` | item decision confirmed (one row or a bulk selection) | `{"action":"REJECT","itemId":["ULP-418-ITEM-1","ULP-418-ITEM-2"],"comment":"…"}` |
| | Approve with changes (one item) | `{"action":"APPROVE_CHANGE","itemId":["…"],"comment":"…","revisedStartDate":"2026-09-28","revisedEndDate":"2026-09-28"}` |
| `OpenRequestId` | a request is opened or closed | request id, or `""` |
| `PendingDateChangeItemId` | the date dialog opens or closes | item id, or `""`. Keep `ItemAvailabilityJson` bound to it |
| `SelectedItemIdsJson` | item checkboxes change | JSON array |
| `SelectedRequestIdsJson` | a request is opened | `["<open id>"]` (the inbox no longer multi-selects requests) |

Action keys are exactly the ones the handler switches on: `APPROVE`, `CONFIRM`, `REJECT`, `REVISION`
(request) and `APPROVE`, `CONFIRM`, `REJECT`, `APPROVE_CHANGE` (item).

## New optional properties

| Property | Default | Purpose |
|---|---|---|
| `requestLevelTypes` | `Campaign;Campaign (Gamification)` | request types that get the Whole request bar. Keep it equal to the types block A cascades (`varCascade`); other types are decided per item only |
| `itemStartDateField`, `itemEndDateField`, `itemPlacementIdField` | `startDate`, `endDate`, `placementId` | item columns shown on each row. Also available as dataset columns `itemStartDate`, `itemEndDate`, `itemPlacementId` |

To show dates and placement on item rows, add **StartDate, EndDate, PlacementId** from
`'[ULP] Approval Item List'` to the control's *items* fields in Studio. Without them the rows still
work; they just show less.

`ItemAvailabilityJson` still takes `{"availableFrom":"yyyy-mm-dd","availableTo":"yyyy-mm-dd"}` and now
also accepts an optional `"freeDates":["yyyy-mm-dd",…]`, shown as *Nearest free* chips. A single-day
revision (end = start) is now allowed.

## Action configuration (`ApprovalConfigJson`)

The JSON shape is the same as 1.x. Each row may now carry an optional `"scope": "request" | "item" | "both"`.
When it is left out, the scope is inferred so that no button sends a key the handler ignores at that level:

- `REVISION` is request-only (block B has no branch for it).
- `CONFIRM` and `APPROVE_CHANGE` are item-only. A request-level `CONFIRM` sets the header but cascades nothing.
- Any action with `requiresDateChange` is item-only.

`CONFIRM` is **off by default** now, because Approve covers the same outcome. Add
`{"key":"CONFIRM","label":"Confirm","resultStatus":"Confirmed","requiresComment":false,"requiresDateChange":false,"requiresConfirmation":true,"active":true,"order":2}`
to the config to bring it back.

## Build, test, package

```bash
npm install
npm run build          # pcf-scripts: lint + typecheck + bundle -> out/controls/ULPApprovalManagement
npm run harness        # http://localhost:8181 - mock datasets + a JS copy of the Power Fx cascade/roll-up
npm run package -- --base path/to/ULPApprovalManagementSolution_1_3_3_0_managed.zip --version 2.0.0.0
```

`npm run package` takes an existing solution export and replaces only the ULPApprovalManagement
control. It keeps ModernActionList, ModernAnalyticsChart and the managed flag, bumps the version, and
writes `dist/ULPApprovalManagementSolution_2_0_0_0_managed.zip`. Import that zip over the current
solution (**Solutions → Import → Upgrade**). Then, in the canvas app: **Get more components → Code →
refresh the component**, and republish.

The harness page logs every output exactly as the canvas app would see it, so a payload change can be
checked without going through Studio.

## Project layout

```
ULPApprovalManagement/
  ControlManifest.Input.xml   properties and datasets (1.x set + v2 optional ones)
  index.ts                    PCF lifecycle, outputs, sequence counters
  lib/                        types, action config, dataset mapping, formatting
  components/                 App, Inbox, Detail, ItemsPanel, Dialogs, Primitives, Icons
  styles/                     Blibli tokens, all scoped under .uam-root
harness/                      local test page (not shipped)
solution/package-solution.js  builds the importable solution zip
```
