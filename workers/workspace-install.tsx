import dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/utils/database-types";
import {
  installDupStacks,
  updateDupStackInstallationTotal,
} from "@/utils/dedup/dup-stacks/install-dup-stacks";
import { fullFetch } from "@/utils/dedup/fetch/full-fetch";
import { installSimilarities } from "@/utils/dedup/similarity/install-similarities";
import {
  WorkspaceInstallId,
  WorkspaceInstallWorkerArgs,
} from "@/workers/workspace-install-types";
import * as Sentry from "@sentry/node";
import { createClient } from "@supabase/supabase-js";
import { Worker } from "bullmq";
import Redis from "ioredis";

Sentry.init({
  dsn: "https://64828dd9591ce51bdf9d75d9749c4ace@o4506264997134336.ingest.sentry.io/4506264999231488",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

async function workerCatch(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    throw e;
  }
}

const redisClient = new Redis(process.env.REDIS_URL!, {
  password: process.env.REDIS_PASSWORD!,
  tls:
    process.env.NODE_ENV! === "development"
      ? {
          checkServerIdentity: (hostname, cert) => {
            return undefined;
          },
        }
      : {},
  maxRetriesPerRequest: null,
});

redisClient.on("error", function (e) {
  Sentry.captureException(e);
});

const worker = new Worker<WorkspaceInstallWorkerArgs, void>(
  WorkspaceInstallId,

  async (job) => {
    await workerCatch(async () => {
      console.log("# workspaceInstall");
      console.log(job.data);

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
    connection: redisClient,
    concurrency: 5,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  }
);

// TODO: Stop the worker gracefully
// process.on('SIGINT', function() {
//   db.stop(function(err) {
//     process.exit(err ? 1 : 0);
//   });
// });

export default worker;
