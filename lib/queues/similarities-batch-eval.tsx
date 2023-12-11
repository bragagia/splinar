import newRedisClient from "@/lib/redis";
import {
  SimilaritiesBatchEvalId,
  SimilaritiesBatchEvalWorkerArgs,
} from "@/workers/similarities-batch-eval";
import { Job, JobsOptions, Queue, QueueEvents } from "bullmq";

export function similaritiesBatchEvalQueueAdd(
  name: string,
  data: SimilaritiesBatchEvalWorkerArgs,
  opts?: JobsOptions | undefined
): Promise<Job<SimilaritiesBatchEvalWorkerArgs, void, string>> {
  const queue = similaritiesBatchEvalQueue();

  return queue.add(name, data, opts);
}

export function similaritiesBatchEvalQueue() {
  return new Queue<SimilaritiesBatchEvalWorkerArgs, void>(
    SimilaritiesBatchEvalId,
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
}

export function newSimilaritiesBatchEvalQueueEvents() {
  return new QueueEvents(SimilaritiesBatchEvalId, {
    connection: newRedisClient(),
  });
}
