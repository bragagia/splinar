import dataCleaningJob from "@/inngest/data-cleaning-job";
import dataCleaningJobBatch from "@/inngest/data-cleaning-job-batch";
import itemsMergeAll from "@/inngest/items-merge-all";
import workspaceCompaniesFetch from "@/inngest/workspace-companies-fetch";
import workspaceContactsFetch from "@/inngest/workspace-contacts-fetch";
import workspaceDupsInstall from "@/inngest/workspace-dups-install";
import workspaceInstall from "@/inngest/workspace-install";
import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceSimilaritiesBatchInstall from "@/inngest/workspace-similarities-batch-install";
import workspaceSimilaritiesLaunch from "@/inngest/workspace-similarities-launch";

export const functions = [
  workspaceInstall,
  workspaceSimilaritiesBatchInstall,
  workspaceDupsInstall,
  workspaceInstallEnd,
  itemsMergeAll,
  workspaceCompaniesFetch,
  workspaceContactsFetch,
  workspaceSimilaritiesLaunch,
  dataCleaningJob,
  dataCleaningJobBatch,
];

export { inngest } from "./client";
