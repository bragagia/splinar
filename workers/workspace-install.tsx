import { ContactType } from "@/types/contacts";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/workers/dedup/dup-stacks/install";
import { fullFetch } from "@/workers/dedup/fetch/install";
import { installSimilarities } from "@/workers/dedup/similarity/install";
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
    const { error: error1 } = await supabaseAdmin
      .from("dup_stack_companies")
      .delete()
      .eq("workspace_id", workspaceId);
    if (error1) throw error1;

    const { error: error2 } = await supabaseAdmin
      .from("dup_stack_contacts")
      .delete()
      .eq("workspace_id", workspaceId);
    if (error2) throw error2;

    const { error: error3 } = await supabaseAdmin
      .from("dup_stacks")
      .delete()
      .eq("workspace_id", workspaceId);
    if (error3) throw error3;

    if (reset === "full" || reset === "similarities_and_dup") {
      const { error: error4 } = await supabaseAdmin
        .from("company_similarities")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error4) throw error4;

      const { error: error5 } = await supabaseAdmin
        .from("contact_similarities")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error5) throw error5;
    }

    let workspaceUpdate: Partial<WorkspaceType> = {
      installation_status: "FRESH",
    };

    if (reset === "full") {
      const { error: error6 } = await supabaseAdmin
        .from("contact_companies")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error6) throw error6;

      const { error: error7 } = await supabaseAdmin
        .from("contacts")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error7) throw error7;

      const { error: error8 } = await supabaseAdmin
        .from("companies")
        .delete()
        .eq("workspace_id", workspaceId);
      if (error8) throw error8;

      workspaceUpdate.installation_fetched = false;
      workspaceUpdate.installation_dup_total = 0;
      workspaceUpdate.installation_dup_done = 0;
      workspaceUpdate.installation_contacts_similarities_total_batches = 0;
      workspaceUpdate.installation_contacts_similarities_done_batches = 0;
      workspaceUpdate.installation_companies_similarities_done_batches = 0;
      workspaceUpdate.installation_companies_similarities_done_batches = 0;
    } else {
      let update: Partial<ContactType> = {
        dup_checked: false,
      };

      workspaceUpdate.installation_dup_total = 0;
      workspaceUpdate.installation_dup_done = 0;

      if (reset === "similarities_and_dup") {
        update.similarity_checked = false;

        workspaceUpdate.installation_contacts_similarities_total_batches = 0;
        workspaceUpdate.installation_contacts_similarities_done_batches = 0;
        workspaceUpdate.installation_companies_similarities_done_batches = 0;
        workspaceUpdate.installation_companies_similarities_done_batches = 0;
      }

      const { error: error9 } = await supabaseAdmin
        .from("contacts")
        .update(update)
        .eq("workspace_id", workspaceId);
      if (error9) throw error9;
    }

    const { error: error10 } = await supabaseAdmin
      .from("workspaces")
      .update(workspaceUpdate)
      .eq("id", workspaceId);
    if (error10) throw error10;
  }

  // INSTALL

  console.log("### Updating workspace status");
  let workspaceUpdatePending: Partial<WorkspaceType> = {
    installation_status: "PENDING",
  };
  const { error: error1 } = await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdatePending)
    .eq("id", workspaceId);
  if (error1) throw error1;

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
    workspace.installation_contacts_similarities_done_batches === 0 ||
    workspace.installation_contacts_similarities_done_batches <
      workspace.installation_contacts_similarities_total_batches ||
    workspace.installation_companies_similarities_done_batches === 0 ||
    workspace.installation_companies_similarities_done_batches <
      workspace.installation_companies_similarities_total_batches
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
  const { error: error2 } = await supabaseAdmin
    .from("workspaces")
    .update(workspaceUpdateEnd)
    .eq("id", workspaceId);
  if (error2) throw error2;

  console.log(
    "### Install done",
    " # Time: ",
    Math.round((performance.now() - startTime) / 1000)
  );
};
