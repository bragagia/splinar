import dataCleaningJob from "@/inngest/data-cleaning-job";
import dataCleaningJobBatch from "@/inngest/data-cleaning-job-batch";
import sendMail from "@/inngest/send-mail";
import workspaceInstall from "@/inngest/workspace-install";
import workspaceInstallDupStacks from "@/inngest/workspace-install-dupstacks";
import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceInstallFetchCompanies from "@/inngest/workspace-install-fetch-companies";
import workspaceInstallFetchContacts from "@/inngest/workspace-install-fetch-contacts";
import workspaceInstallSimilarities from "@/inngest/workspace-install-similarities";
import workspaceInstallSimilaritiesBatch from "@/inngest/workspace-install-similarities-batch";
import workspaceItemsMergeAll from "@/inngest/workspace-items-merge-all";
import workspaceUpdateAll from "@/inngest/workspace-update-all";
import workspaceUpdatePollingHubspot from "@/inngest/workspace-update-polling-hubspot";

export const functions = [
  workspaceInstall,
  workspaceInstallSimilaritiesBatch,
  workspaceInstallDupStacks,
  workspaceInstallEnd,
  workspaceItemsMergeAll,
  workspaceInstallFetchCompanies,
  workspaceInstallFetchContacts,
  workspaceInstallSimilarities,
  dataCleaningJob,
  dataCleaningJobBatch,
  workspaceUpdateAll,
  workspaceUpdatePollingHubspot,
  sendMail,
];

export { inngest } from "./client";
