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
    table: "contacts" | "companies";
    batchAIds: string[];
    batchBIds?: string[];
  };
};

export type WorkspaceContactsSimilaritiesBatchInstallFinished = {
  name: "workspace/contacts/similarities/install.finished";
  data: {
    workspaceId: string;
    secondRun?: boolean;
  };
};

export type WorkspaceCompaniesSimilaritiesBatchInstallFinished = {
  name: "workspace/companies/similarities/install.finished";
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

export type CompaniesMergeAllStart = {
  name: "companies/merge-all.start";
  data: {
    workspaceId: string;
    lastItemCreatedAt?: string;
  };
};

export type ContactsMergeAllStart = {
  name: "contacts/merge-all.start";
  data: {
    workspaceId: string;
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

export const schemas = new EventSchemas().fromUnion<
  | WorkspaceInstallStart
  | WorkspaceFetchCompaniesStart
  | WorkspaceFetchContactsStart
  | WorkspaceSimilaritiesBatchInstallStart
  | WorkspaceContactsSimilaritiesBatchInstallFinished
  | WorkspaceCompaniesSimilaritiesBatchInstallFinished
  | WorkspaceAnyDupsInstallFinished
  | WorkspaceFetchFinished
  | CompaniesMergeAllStart
  | ContactsMergeAllStart
>();
