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
  supabaseSession: {
    refresh_token: string;
    access_token: string;
  };
  workspaceId: string;
  softInstall: boolean;
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

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await supabase.auth.setSession(job.data.supabaseSession);
  if (error) {
    throw error;
  }

  console.log("### Updating workspace status");
  let workspaceUpdatePending: Partial<WorkspaceType> = {
    installation_status: "PENDING",
  };
  await supabase
    .from("workspaces")
    .update(workspaceUpdatePending)
    .eq("id", job.data.workspaceId);

  if (!job.data.softInstall) {
    console.log(
      "### Fetching hubspot data",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await fullFetch(supabase, job.data.workspaceId);
    await updateDupStackInstallationTotal(supabase, job.data.workspaceId);
  }

  console.log(
    "### Install similarities",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installSimilarities(supabase, job.data.workspaceId);

  console.log(
    "### Install dup stacks",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installDupStacks(supabase, job.data.workspaceId);

  let workspaceUpdateEnd: Partial<WorkspaceType> = {
    installation_status: "DONE",
  };
  await supabase
    .from("workspaces")
    .update(workspaceUpdateEnd)
    .eq("id", job.data.workspaceId);

  console.log(
    "### Install done",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
};
