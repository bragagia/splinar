import { itemTypeT } from "@/lib/items_common";
import { EventSchemas } from "inngest";

type WorkspaceInstallStart = {
  name: "workspace/install.start";
  data: {
    workspaceId: string;
    reset: "full" | "dup_stacks" | "similarities_and_dup" | null;
  };
};

export type WorkspaceSimilaritiesBatchInstallStart = {
  name: "workspace/similarities/batch-install.start";
  data: {
    workspaceId: string;
    table: itemTypeT;
    batchAIds: string[];
    batchBIds?: string[];
  };
};

export type WorkspaceSimilaritiesBatchInstallFinished = {
  name: "workspace/any/similarities/install.finished";
  data: {
    workspaceId: string;
    secondRun?: boolean;
  };
};

export type WorkspaceAnyDupsInstallFinished = {
  name: "workspace/any/dups/install.finished";
  data: {
    workspaceId: string;
  };
};

export type ItemsMergeAllStart = {
  name: "items/merge-all.start";
  data: {
    workspaceId: string;
    itemType: itemTypeT;
    lastItemCreatedAt?: string;
  };
};

export type WorkspaceFetchCompaniesStart = {
  name: "workspace/companies/fetch.start";
  data: {
    workspaceId: string;
    after?: string;
  };
};

export type WorkspaceFetchContactsStart = {
  name: "workspace/contacts/fetch.start";
  data: {
    workspaceId: string;
    after?: string;
  };
};

export type WorkspaceFetchFinished = {
  name: "workspace/all/fetch.finished";
  data: {
    workspaceId: string;
    after?: string;
  };
};

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

export const schemas = new EventSchemas().fromUnion<
  | WorkspaceInstallStart
  | WorkspaceFetchCompaniesStart
  | WorkspaceFetchContactsStart
  | WorkspaceSimilaritiesBatchInstallStart
  | WorkspaceSimilaritiesBatchInstallFinished
  | WorkspaceAnyDupsInstallFinished
  | WorkspaceFetchFinished
  | ItemsMergeAllStart
  | DataCleaningMasterDailyStart
  | DataCleaningJobFullDBStart
  | DataCleaningJobBatchStart
>();
