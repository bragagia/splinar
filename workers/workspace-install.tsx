import { ContactType, WorkspaceType } from "@/types/database-types";
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
  workspaceId: string;
  reset: "full" | "dup_stacks" | "similarities_and_dup" | null;
};

export const workspaceInstallProcessor: Processor<
  WorkspaceInstallWorkerArgs,
  void,
  string
> = async (job) => {
  console.log("# workspaceInstall");
  console.log(job.data);
  const { workspaceId, reset } = job.data;

  console.log("### Workspace Install", workspaceId);
  const startTime = performance.now();

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // RESET

  if (reset) {
    await supabaseAdmin
      .from("dup_stacks")
      .delete()
      .eq("workspace_id", workspaceId);

    if (reset === "full" || reset === "similarities_and_dup") {
      await supabaseAdmin
        .from("contact_similarities")
        .delete()
        .eq("workspace_id", workspaceId);
    }

    let workspaceUpdate: Partial<WorkspaceType> = {
      installation_status: "FRESH",
    };

    if (reset === "full") {
      await supabaseAdmin
        .from("contact_companies")
        .delete()
        .eq("workspace_id", workspaceId);

      await supabaseAdmin
        .from("contacts")
        .delete()
        .eq("workspace_id", workspaceId);

      await supabaseAdmin
        .from("companies")
        .delete()
        .eq("workspace_id", workspaceId);

      workspaceUpdate.installation_fetched = false;
      workspaceUpdate.installation_dup_total = 0;
      workspaceUpdate.installation_dup_done = 0;
      workspaceUpdate.installation_similarity_total_batches = 0;
      workspaceUpdate.installation_similarity_done_batches = 0;
    } else {
      let update: Partial<ContactType> = {
        dup_checked: false,
      };

      workspaceUpdate.installation_dup_total = 0;
      workspaceUpdate.installation_dup_done = 0;

      if (reset === "similarities_and_dup") {
        update.similarity_checked = false;

        workspaceUpdate.installation_similarity_total_batches = 0;
        workspaceUpdate.installation_similarity_done_batches = 0;
      }

      await supabaseAdmin
        .from("contacts")
        .update(update)
        .eq("workspace_id", workspaceId);
    }

    await supabaseAdmin
      .from("workspaces")
      .update(workspaceUpdate)
      .eq("id", workspaceId);
  }

  // INSTALL

  console.log("### Updating workspace status");
  let workspaceUpdatePending: Partial<WorkspaceType> = {
    installation_status: "PENDING",
  };
  await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdatePending)
    .eq("id", workspaceId);

  const { data: workspace, error } = await supabaseAdmin
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (error || !workspace) {
    throw error || new Error("missing workspace");
  }

  if (!workspace.installation_fetched) {
    console.log(
      "### Fetching hubspot data",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await fullFetch(supabaseAdmin, workspaceId);
    await updateDupStackInstallationTotal(supabaseAdmin, workspaceId);
  }

  if (
    workspace.installation_similarity_done_batches === 0 ||
    workspace.installation_similarity_done_batches <
      workspace.installation_similarity_total_batches
  ) {
    console.log(
      "### Install similarities",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await installSimilarities(supabaseAdmin, workspaceId);
  }

  console.log(
    "### Install dup stacks",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
  await installDupStacks(supabaseAdmin, workspaceId);

  let workspaceUpdateEnd: Partial<WorkspaceType> = {
    installation_status: "DONE",
  };
  await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdateEnd)
    .eq("id", workspaceId);

  console.log(
    "### Install done",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
};
