import { Database } from "@/types/supabase";
import { similaritiesBatchEval } from "@/workers/dedup/similarity/similarities-batch-eval";
import { createClient } from "@supabase/supabase-js";
import { Processor } from "bullmq";
import console from "console";

export const SimilaritiesBatchEvalId = "similaritiesBatchEval";

export type SimilaritiesBatchEvalWorkerArgs = {
  workspaceId: string;
  table: "contacts" | "companies";
  batchAIds: string[];
  batchBIds?: string[];
};

export const similaritiesBatchEvalProcessor: Processor<
  SimilaritiesBatchEvalWorkerArgs,
  void,
  string
> = async (job) => {
  console.log("# similaritiesBatchEval");

  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await similaritiesBatchEval(
    supabaseAdmin,
    job.data.workspaceId,
    job.data.table,
    job.data.batchAIds,
    job.data.batchBIds
  );

  console.log("# End");
};
