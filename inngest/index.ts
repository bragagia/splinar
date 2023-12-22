import companiesMergeAll from "@/inngest/companies-merge-all";
import workspaceCompaniesDupsInstall from "@/inngest/workspace-companies-dups-install";
import workspaceContactDupsInstall from "@/inngest/workspace-contacts-dups-install";
import workspaceInstall from "@/inngest/workspace-install";
import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceSimilaritiesBatchInstall from "@/inngest/workspace-similarities-batch-install";

export const functions = [
  workspaceInstall,
  workspaceSimilaritiesBatchInstall,
  workspaceContactDupsInstall,
  workspaceCompaniesDupsInstall,
  workspaceInstallEnd,
  companiesMergeAll,
];

export { inngest } from "./client";
