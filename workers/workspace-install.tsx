import { WorkspaceType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/utils/dedup/dup-stacks/install-dup-stacks";
import { fullFetch } from "@/utils/dedup/fetch/full-fetch";
import { installSimilarities } from "@/utils/dedup/similarity/install-similarities";
import { createClient } from "@supabase/supabase-js";
import { Processor } from "bullmq";
import console from "console";

export const WorkspaceInstallId = "workspaceInstall";

export type WorkspaceInstallWorkerArgs = {
  // secureUserId must be given from supabase auth, it is used to ensure that the worker respect its rights
  userId: string;
  workspaceId: string;
  softInstall: boolean; // TODO: is not used currently
};

export const workspaceInstallProcessor: Processor<
  WorkspaceInstallWorkerArgs,
  void,
  string
> = async (job) => {
  console.log("# workspaceInstall");
  console.log(job.data);

  console.log("### Workspace Install", job.data.workspaceId);
  const startTime = performance.now();

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("### Updating workspace status");
  let workspaceUpdatePending: Partial<WorkspaceType> = {
    installation_status: "PENDING",
  };
  await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdatePending)
    .eq("id", job.data.workspaceId);

  if (!job.data.softInstall) {
    console.log(
      "### Fetching hubspot data",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await fullFetch(supabaseAdmin, job.data.workspaceId);
    await updateDupStackInstallationTotal(supabaseAdmin, job.data.workspaceId);
  }

  console.log(
    "### Install similarities",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installSimilarities(supabaseAdmin, job.data.workspaceId);

  console.log(
    "### Install dup stacks",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installDupStacks(supabaseAdmin, job.data.workspaceId);

  let workspaceUpdateEnd: Partial<WorkspaceType> = {
    installation_status: "DONE",
  };
  await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdateEnd)
    .eq("id", job.data.workspaceId);

  console.log(
    "### Install done",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
};
