import newRedisClient from "@/lib/redis";
import {
  WorkspaceInstallId,
  WorkspaceInstallWorkerArgs,
  workspaceInstallProcessor,
} from "@/workers/workspace-install";
import * as Sentry from "@sentry/node";
import { Worker } from "bullmq";

// Sentry init

Sentry.init({
  dsn: "https://64828dd9591ce51bdf9d75d9749c4ace@o4506264997134336.ingest.sentry.io/4506264999231488",

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

export async function workerCatch(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    throw e;
  }
}

// #####
// # Workers loading
// #####

const workerConfig = {
  connection: newRedisClient(),
  concurrency: 5,
  removeOnComplete: {
    age: 24 * 3600, // keep up to 1 day
  },
  removeOnFail: {
    age: 4 * 24 * 3600, // keep up to 4 days
  },
};

const workspaceInstallWorker = new Worker<WorkspaceInstallWorkerArgs, void>(
  WorkspaceInstallId,

  async (job) => {
    await workerCatch(async () => {
      workspaceInstallProcessor(job);
    });
  },

  workerConfig
);

// #####

// Shutdown hooks

async function gracefullShutdown() {
  await workspaceInstallWorker.close();
}

async function forceShutdown() {
  await workspaceInstallWorker.close(true);

  console.log("Warning: Shutdown forced after 2 minutes");
  Sentry.captureException(
    new Error("Gracefull shutdown of worker failed after 2 minutes")
  );

  process.exit(1);
}

let forceShutdownNextTime = false;
process.on("SIGINT", async function () {
  if (forceShutdownNextTime) {
    console.log("Force shutdown");
    process.exit(1);
  }
  forceShutdownNextTime = true;

  console.log("SIGINT received, closing workers gracefully");

  setTimeout(forceShutdown, 2 * 60 * 1000);
  await gracefullShutdown();

  console.log("Shutdown complete");
  process.exit(0);
});
