import * as React from "react";
import * as ReactDOM from "react-dom";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { App } from "./components/App";
import { readComments, readHistory, readItems, readRequests } from "./lib/data";
import { ControlConfig, ItemActionPayload, RequestActionPayload } from "./lib/types";

/**
 * ApprovalUIManagement (ULP Hub) — v2.
 *
 * The output contract is the one the ApprovalScreen Power Fx handler reads, unchanged from 1.6:
 *   ActionSequence / ApprovalActionPayloadJson      { action, requestId: [id], comment? }
 *   ItemActionSequence / ItemActionPayloadJson      { action, itemId: [...], comment?, revisedStartDate?, revisedEndDate? }
 *   OpenRequestId, SelectedRequestIdsJson, SelectedItemIdsJson, PendingDateChangeItemId
 * A sequence only ever increments, so the handler's "sequence <> last seen" test fires once per press,
 * including when the same payload is sent twice.
 */
export class ApprovalUIManagement implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private notifyOutputChanged!: () => void;
    private context!: ComponentFramework.Context<IInputs>;

    private selectedRequestIds: string[] = [];
    private requestPayload?: RequestActionPayload;
    private actionSequence = 0;
    private openRequestId = "";
    private selectedItemIds: string[] = [];
    private itemPayload?: ItemActionPayload;
    private itemActionSequence = 0;
    private pendingDateChangeItemId = "";

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;
        context.mode.trackContainerResize(true);
        this.render(context);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.render(context);
    }

    public getOutputs(): IOutputs {
        return {
            SelectedRequestIdsJson: JSON.stringify(this.selectedRequestIds),
            ApprovalActionPayloadJson: this.requestPayload ? JSON.stringify(this.requestPayload) : "",
            ActionSequence: this.actionSequence,
            OpenRequestId: this.openRequestId,
            SelectedItemIdsJson: JSON.stringify(this.selectedItemIds),
            ItemActionPayloadJson: this.itemPayload ? JSON.stringify(this.itemPayload) : "",
            ItemActionSequence: this.itemActionSequence,
            PendingDateChangeItemId: this.pendingDateChangeItemId
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.container);
    }

    // --- callbacks from the React tree -------------------------------------------------

    private onOpenRequest = (id: string): void => {
        if (this.openRequestId === id) return;
        this.openRequestId = id;
        this.selectedItemIds = [];
        this.notifyOutputChanged();
    };

    private onRequestSelection = (ids: string[]): void => {
        this.selectedRequestIds = ids;
        this.notifyOutputChanged();
    };

    private onRequestAction = (payload: RequestActionPayload): void => {
        this.requestPayload = payload;
        this.actionSequence += 1;
        this.notifyOutputChanged();
    };

    private onItemSelection = (ids: string[]): void => {
        this.selectedItemIds = ids;
        this.notifyOutputChanged();
    };

    private onItemAction = (payload: ItemActionPayload): void => {
        this.itemPayload = payload;
        this.itemActionSequence += 1;
        this.notifyOutputChanged();
    };

    private onPendingDateChange = (itemId: string): void => {
        if (this.pendingDateChangeItemId === itemId) return;
        this.pendingDateChangeItemId = itemId;
        this.notifyOutputChanged();
    };

    /** Re-queries every dataset the control shows (as 1.6 does). */
    private onRefresh = (): void => {
        const ps = this.context?.parameters;
        if (!ps) return;
        [ps.requests, ps.items, ps.history, ps.comments].forEach((ds) => {
            try {
                ds?.refresh();
            } catch {
                /* a dataset that is not bound has nothing to refresh */
            }
        });
    };

    private onLoadMoreRequests = (): void => {
        try {
            const paging = this.context?.parameters.requests?.paging;
            if (paging?.hasNextPage) paging.loadNextPage();
        } catch {
            /* ignore */
        }
    };

    // --- render ---------------------------------------------------------------------------

    private render(context: ComponentFramework.Context<IInputs>): void {
        this.context = context;
        const ps = context.parameters;
        const params = ps as unknown as Record<string, { raw?: unknown } | undefined>;
        const str = (v: { raw: string | null } | undefined, fallback: string): string => (v?.raw && v.raw.trim().length > 0 ? v.raw : fallback);
        const bool = (v: { raw: boolean } | undefined, fallback: boolean): boolean => (v === undefined || v.raw === null || v.raw === undefined ? fallback : !!v.raw);

        const config: ControlConfig = {
            title: str(ps.title, "Approval Inbox"),
            subtitle: str(ps.subtitle, "Review and take action on requests that require your approval."),
            approvalConfigJson: ps.ApprovalConfigJson?.raw ?? "",
            showSearch: bool(ps.showSearch, true),
            showFilter: bool(ps.showFilter, true),
            showSummaryCards: bool(ps.showSummaryCards, true),
            emptyStateTitle: str(ps.emptyStateTitle, "No approvals waiting"),
            emptyStateSubtitle: str(ps.emptyStateSubtitle, "You're all caught up."),
            allowRequestActions: bool(ps.allowRequestActions, true),
            allowItemActions: bool(ps.allowItemActions, true),
            requestLevelTypes: (ps.requestLevelTypes?.raw ?? "")
                .split(";")
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
        };

        ReactDOM.render(
            React.createElement(App, {
                config,
                requests: readRequests(ps.requests, params),
                items: readItems(ps.items, params),
                history: readHistory(ps.history, params),
                comments: readComments(ps.comments, params),
                isProcessing: bool(ps.IsProcessing, false),
                itemAvailabilityJson: ps.ItemAvailabilityJson?.raw ?? "",
                onOpenRequest: this.onOpenRequest,
                onRequestSelection: this.onRequestSelection,
                onRequestAction: this.onRequestAction,
                onItemSelection: this.onItemSelection,
                onItemAction: this.onItemAction,
                onPendingDateChange: this.onPendingDateChange,
                onRefresh: this.onRefresh,
                onLoadMoreRequests: this.onLoadMoreRequests
            }),
            this.container
        );
    }
}
