import { similaritiesUpdateBatch } from "@/inngest/dedup/similarity/update-batch";
import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-similarities-batch-install",
    retries: 0,
    concurrency: { limit: 20 },
  },
  { event: "workspace/similarities/batch-install.start" },
  async ({ event, step, logger }) => {
    logger.info("# similaritiesBatchEval");

    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await step.run("similaritiesBatchEval", async () => {
      await similaritiesUpdateBatch(
        supabaseAdmin,
        event.data.workspaceId,
        event.data.table,
        event.data.batchAIds,
        event.data.batchBIds
      );
    });

    logger.info("# similaritiesBatchEval - END");
  }
);
