import { ItemTypeT } from "@/lib/items_common";
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

export type WorkspaceInstallFetchCompaniesStart = {
  name: "workspace/install/fetch/companies.start";
  data: {
    workspaceId: string;
    operationId: string;
    after?: string;
  };
};

export type WorkspaceInstallFetchContactsStart = {
  name: "workspace/install/fetch/contacts.start";
  data: {
    workspaceId: string;
    operationId: string;
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

// DATA CLEANING

export type DataCleaningMasterDailyStart = {
  name: "data-cleaning/master/daily.start";
  data: {
    workspaceId: string;
  };
};

export type DataCleaningJobFullDBStart = {
  name: "data-cleaning/job-fulldb.start";
  data: {
    workspaceId: string;
    jobId: string;
  };
};

export type DataCleaningJobBatchStart = {
  name: "data-cleaning/job/batch.start";
  data: {
    workspaceId: string;
    jobId: string;
    itemIds: string[];
  };
};

export type SendMailStart = {
  name: "send-mail.start";
  data: postmark.Message;
};

export const schemas = new EventSchemas().fromUnion<
  | WorkspaceInstallStart
  | WorkspaceInstallFetchCompaniesStart
  | WorkspaceInstallFetchContactsStart
  | WorkspaceInstallSimilaritiesBatchStart
  | WorkspaceInstallDupStacksStart
  | WorkspaceInstallEndStart
  | WorkspaceInstallJobsStart
  | WorkspaceInstallSimilaritiesStart
  | WorkspaceUpdatePollingHubspotStart
  | WorkspaceUpdateAllStart
  | ItemsMergeAllStart
  | DataCleaningMasterDailyStart
  | DataCleaningJobFullDBStart
  | DataCleaningJobBatchStart
  | SendMailStart
>();
