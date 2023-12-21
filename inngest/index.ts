import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceCompaniesDupsInstall from "./workspace-companies-dups-install";
import workspaceContactDupsInstall from "./workspace-contacts-dups-install";
import workspaceInstall from "./workspace-install";
import workspaceSimilaritiesBatchInstall from "./workspace-similarities-batch-install";

export const functions = [
  workspaceInstall,
  workspaceSimilaritiesBatchInstall,
  workspaceContactDupsInstall,
  workspaceCompaniesDupsInstall,
  workspaceInstallEnd,
];

export { inngest } from "./client";
