import { workerInit } from "@/workers/init";
import {
  SimilaritiesBatchEvalId,
  similaritiesBatchEvalProcessor,
} from "@/workers/similarities-batch-eval";

workerInit(SimilaritiesBatchEvalId, similaritiesBatchEvalProcessor);
