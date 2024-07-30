import jobAcceptAllJobLogs from "@/inngest/job-accept-all-job-logs";
import jobExecOnAllItems from "@/inngest/job-exec-on-all-items";
import mondayRecap from "@/inngest/monday-recap";
import sendMail from "@/inngest/send-mail";
import workspaceInstall from "@/inngest/workspace-install";
import workspaceInstallDupStacks from "@/inngest/workspace-install-dupstacks";
import workspaceInstallEnd from "@/inngest/workspace-install-end";
import workspaceInstallFetch from "@/inngest/workspace-install-fetch";
import workspaceInstallJobs from "@/inngest/workspace-install-jobs";
import workspaceInstallSimilarities from "@/inngest/workspace-install-similarities";
import workspaceInstallSimilaritiesBatch from "@/inngest/workspace-install-similarities-batch";
import workspaceInstallSimilaritiesFast from "@/inngest/workspace-install-similarities-fast";
import workspaceInstallSimilaritiesFastField from "@/inngest/workspace-install-similarities-fast-field";
import workspaceItemsMergeAll from "@/inngest/workspace-items-merge-all";
import workspaceUpdateAll from "@/inngest/workspace-update-all";
import workspaceUpdatePollingHubspot from "@/inngest/workspace-update-polling-hubspot";

export const functions = [
  workspaceInstall,
  workspaceInstallSimilaritiesBatch,
  workspaceInstallDupStacks,
  workspaceInstallEnd,
  workspaceItemsMergeAll,
  workspaceInstallJobs,
  workspaceInstallSimilarities,
  workspaceUpdateAll,
  workspaceUpdatePollingHubspot,
  jobExecOnAllItems,
  jobAcceptAllJobLogs,
  sendMail,
  mondayRecap,
  workspaceInstallSimilaritiesFast,
  workspaceInstallSimilaritiesFastField,
  workspaceInstallFetch,
];

export { inngest } from "./client";
