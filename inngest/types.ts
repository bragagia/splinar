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

export const schemas = new EventSchemas().fromUnion<
  | WorkspaceInstallStart
  | WorkspaceSimilaritiesBatchInstallStart
  | WorkspaceContactsSimilaritiesBatchInstallFinished
  | WorkspaceCompaniesSimilaritiesBatchInstallFinished
>();
