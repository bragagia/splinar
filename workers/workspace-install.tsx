import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import {
  WorkspaceInstallId,
  WorkspaceInstallWorkerArgs,
} from "@/queues/workspace-install";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/utils/database-types";
import { deferCatch } from "@/utils/dedup/defer-catch";
import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/utils/dedup/dup-stacks/install-dup-stacks";
import { fullFetch } from "@/utils/dedup/fetch/full-fetch";
import { installSimilarities } from "@/utils/dedup/similarity/install-similarities";
import { createClient } from "@supabase/supabase-js";
import { Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL!);

const worker = new Worker<WorkspaceInstallWorkerArgs, void>(
  WorkspaceInstallId,

  async (job) => {
    console.log("# workspaceInstall");
    console.log(job.data);

    await deferCatch(async () => {
      console.log("### Workspace Install", job.data.workspaceId);

      const startTime = performance.now();

      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error } = await supabase.auth.setSession(
        job.data.supabaseSession
      );
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
    });
  },
  {
    connection,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

export default worker;
