import { ItemFieldConfigT, ItemTypeT } from "@/lib/items_common";
import { EventSchemas } from "inngest";
import postmark from "postmark";

// WORKSPACE INSTALL

type WorkspaceInstallStart = {
  name: "workspace/install.start";
  data: {
    workspaceId: string;
    reset: "full" | "dup_stacks" | "similarities_and_dup" | null;
  };
};

export type WorkspaceInstallFetchStart = {
  name: "workspace/install/fetch.start";
  data: {
    workspaceId: string;
    operationId: string;
    itemTypes: ItemTypeT[];
    after?: string;
  };
};

export type WorkspaceInstallSimilaritiesStart = {
  name: "workspace/install/similarities.start";
  data: {
    workspaceId: string;
    operationId: string;
    secondRun?: boolean;
  };
};

export type WorkspaceInstallSimilaritiesFastStart = {
  name: "workspace/install/similarities-fast.start";
  data: {
    workspaceId: string;
    operationId: string;
    itemType: ItemTypeT;
  };
};

export type WorkspaceInstallSimilaritiesFastFieldStart = {
  name: "workspace/install/similarities-fast/field.start";
  data: {
    workspaceId: string;
    operationId: string;
    sourceNames: string[];
    itemType: ItemTypeT;
    fieldConfigId: string;
    matchingMethod: ItemFieldConfigT["matchingMethod"];
  };
};

export type WorkspaceInstallJobsStart = {
  name: "workspace/install/jobs.start";
  data: {
    workspaceId: string;
    operationId: string;
  };
};

export type WorkspaceInstallSimilaritiesBatchStart = {
  name: "workspace/install/similarities/batch.start";
  data: {
    workspaceId: string;
    operationId: string;
    itemType: ItemTypeT;
    batchIds: string[];
    comparedItemsIds?: string[];
  };
};

export type WorkspaceInstallDupStacksStart = {
  name: "workspace/install/dupstacks.start";
  data: {
    workspaceId: string;
    operationId: string;
    secondRun?: boolean;
  };
};

export type WorkspaceInstallEndStart = {
  name: "workspace/install/end.start";
  data: {
    workspaceId: string;
    operationId: string;
  };
};

// WORKSPACE UPDATE

export type WorkspaceUpdateAllStart = {
  name: "workspace/update/all.start";
  data: {};
};

export type WorkspaceUpdatePollingHubspotStart = {
  name: "workspace/update/polling/hubspot.start";
  data: {
    workspaceId: string;
    operationId: string;
    itemType: ItemTypeT;
    startFilter: string;
    endFilter: string;
    after?: string;
  };
};

// MERGE ALL

export type ItemsMergeAllStart = {
  name: "items/merge-all.start";
  data: {
    workspaceId: string;
    itemType: ItemTypeT;
    includePotentials: boolean;
    lastItemCreatedAt?: string;
  };
};

// Jobs

export type JobExecOnAllItemsStart = {
  name: "job/exec-on-all-items.start";
  data: {
    workspaceId: string;
    operationId: string;
    dataCleaningValidatedJobId: string;
    lastItemIdSeq?: number;
  };
};

export type JobAcceptAllJobLogsStart = {
  name: "job/accept-all-job-logs.start";
  data: {
    workspaceId: string;
    operationId: string;
    dataCleaningJobId: string;
  };
};

// Mail

export type SendMailStart = {
  name: "send-mail.start";
  data: postmark.Message;
};

export const schemas = new EventSchemas().fromUnion<
  | WorkspaceInstallStart
  | WorkspaceInstallFetchStart
  | WorkspaceInstallSimilaritiesBatchStart
  | WorkspaceInstallDupStacksStart
  | WorkspaceInstallEndStart
  | WorkspaceInstallJobsStart
  | WorkspaceInstallSimilaritiesStart
  | WorkspaceInstallSimilaritiesFastStart
  | WorkspaceInstallSimilaritiesFastFieldStart
  | WorkspaceUpdatePollingHubspotStart
  | WorkspaceUpdateAllStart
  | ItemsMergeAllStart
  | JobExecOnAllItemsStart
  | JobAcceptAllJobLogsStart
  | SendMailStart
>();
