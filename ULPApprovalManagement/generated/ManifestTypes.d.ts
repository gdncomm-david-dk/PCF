/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    title: ComponentFramework.PropertyTypes.StringProperty;
    subtitle: ComponentFramework.PropertyTypes.StringProperty;
    requestIdField: ComponentFramework.PropertyTypes.StringProperty;
    campaignField: ComponentFramework.PropertyTypes.StringProperty;
    requestTypeField: ComponentFramework.PropertyTypes.StringProperty;
    requestedStartDateField: ComponentFramework.PropertyTypes.StringProperty;
    requestedEndDateField: ComponentFramework.PropertyTypes.StringProperty;
    submittedByField: ComponentFramework.PropertyTypes.StringProperty;
    approverField: ComponentFramework.PropertyTypes.StringProperty;
    statusField: ComponentFramework.PropertyTypes.StringProperty;
    itemIdField: ComponentFramework.PropertyTypes.StringProperty;
    itemRequestIdField: ComponentFramework.PropertyTypes.StringProperty;
    itemNameField: ComponentFramework.PropertyTypes.StringProperty;
    itemTypeField: ComponentFramework.PropertyTypes.StringProperty;
    itemStatusField: ComponentFramework.PropertyTypes.StringProperty;
    historyIdField: ComponentFramework.PropertyTypes.StringProperty;
    historyRequestIdField: ComponentFramework.PropertyTypes.StringProperty;
    historyActionLabelField: ComponentFramework.PropertyTypes.StringProperty;
    historyActorField: ComponentFramework.PropertyTypes.StringProperty;
    historyTimestampField: ComponentFramework.PropertyTypes.StringProperty;
    historyCommentField: ComponentFramework.PropertyTypes.StringProperty;
    commentIdField: ComponentFramework.PropertyTypes.StringProperty;
    commentRequestIdField: ComponentFramework.PropertyTypes.StringProperty;
    commentAuthorField: ComponentFramework.PropertyTypes.StringProperty;
    commentTimestampField: ComponentFramework.PropertyTypes.StringProperty;
    commentTextField: ComponentFramework.PropertyTypes.StringProperty;
    itemStartDateField: ComponentFramework.PropertyTypes.StringProperty;
    itemEndDateField: ComponentFramework.PropertyTypes.StringProperty;
    itemPlacementIdField: ComponentFramework.PropertyTypes.StringProperty;
    requestLevelTypes: ComponentFramework.PropertyTypes.StringProperty;
    ApprovalConfigJson: ComponentFramework.PropertyTypes.StringProperty;
    ItemAvailabilityJson: ComponentFramework.PropertyTypes.StringProperty;
    showSearch: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    showFilter: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    showSummaryCards: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    emptyStateTitle: ComponentFramework.PropertyTypes.StringProperty;
    emptyStateSubtitle: ComponentFramework.PropertyTypes.StringProperty;
    IsProcessing: ComponentFramework.PropertyTypes.TwoOptionsProperty;
    requests: ComponentFramework.PropertyTypes.DataSet;
    items: ComponentFramework.PropertyTypes.DataSet;
    history: ComponentFramework.PropertyTypes.DataSet;
    comments: ComponentFramework.PropertyTypes.DataSet;
}
export interface IOutputs {
    SelectedRequestIdsJson?: string;
    ApprovalActionPayloadJson?: string;
    ActionSequence?: number;
    OpenRequestId?: string;
    SelectedItemIdsJson?: string;
    ItemActionPayloadJson?: string;
    ItemActionSequence?: number;
    PendingDateChangeItemId?: string;
}
