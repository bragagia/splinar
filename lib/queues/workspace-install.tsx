import newRedisClient from "@/lib/redis";
import {
  WorkspaceInstallId,
  WorkspaceInstallWorkerArgs,
} from "@/workers/workspace-install";
import { Job, JobsOptions, Queue } from "bullmq";

export function workspaceInstallQueueAdd(
  name: string,
  data: WorkspaceInstallWorkerArgs,
  opts?: JobsOptions | undefined
): Promise<Job<WorkspaceInstallWorkerArgs, void, string>> {
  const queue = new Queue<WorkspaceInstallWorkerArgs, void>(
    WorkspaceInstallId,
    {
      connection: newRedisClient(),
      defaultJobOptions: {
        attempts: 7,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    }
  );

  return queue.add(name, data, opts);
}
