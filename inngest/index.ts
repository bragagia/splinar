import companiesMergeAll from "@/inngest/companies-merge-all";
import contactsMergeAll from "@/inngest/contacts-merge-all";
import workspaceCompaniesDupsInstall from "@/inngest/workspace-companies-dups-install";
import workspaceCompaniesFetch from "@/inngest/workspace-companies-fetch";
import workspaceContactDupsInstall from "@/inngest/workspace-contacts-dups-install";
import workspaceContactsFetch from "@/inngest/workspace-contacts-fetch";
import workspaceInstall from "@/inngest/workspace-install";
import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceSimilaritiesBatchInstall from "@/inngest/workspace-similarities-batch-install";
import workspaceSimilaritiesLaunch from "@/inngest/workspace-similarities-launch";

export const functions = [
  workspaceInstall,
  workspaceSimilaritiesBatchInstall,
  workspaceContactDupsInstall,
  workspaceCompaniesDupsInstall,
  workspaceInstallEnd,
  companiesMergeAll,
  contactsMergeAll,
  workspaceCompaniesFetch,
  workspaceContactsFetch,
  workspaceSimilaritiesLaunch,
];

export { inngest } from "./client";
