"use server";
// "use server" is needed for local dev to work as intended

import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/utils/database-types";
import { deferCatch } from "@/utils/dedup/defer-catch";
import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/utils/dedup/dup-stacks/install-dup-stacks";
import { fullFetch } from "@/utils/dedup/fetch/full-fetch";
import { installSimilarities } from "@/utils/dedup/similarity/install-similarities";
import { defer } from "@defer/client";
import { createClient } from "@supabase/supabase-js";

async function workspaceInstall(
  supabaseSession: {
    refresh_token: string;
    access_token: string;
  },
  workspaceId: string,
  softInstall: boolean = false
) {
  await deferCatch(async () => {
    console.log("### Workspace Install", workspaceId);

    const startTime = performance.now();

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase.auth.setSession(supabaseSession);
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
      .eq("id", workspaceId);

    if (!softInstall) {
      console.log(
        "### Fetching hubspot data",
        " # Time: ",
        Math.round((performance.now() - startTime) / 1000)
      );
      await fullFetch(supabase, workspaceId);
      await updateDupStackInstallationTotal(supabase, workspaceId);
    }

    console.log(
      "### Install similarities",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await installSimilarities(supabase, workspaceId);

    console.log(
      "### Install dup stacks",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
    await installDupStacks(supabase, workspaceId);

    let workspaceUpdateEnd: Partial<WorkspaceType> = {
      installation_status: "DONE",
    };
    await supabase
      .from("workspaces")
      .update(workspaceUpdateEnd)
      .eq("id", workspaceId);

    console.log(
      "### Install done",
      " # Time: ",
      Math.round((performance.now() - startTime) / 1000)
    );
  });
}

export default defer(workspaceInstall);
