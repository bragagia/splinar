import { similaritiesUpdateBatch } from "@/inngest/dedup/similarity/update-batch";
import { inngest } from "./client";
import { newSupabaseRootClient } from "@/lib/supabase/root";

export default inngest.createFunction(
  {
    id: "workspace-similarities-batch-install",
    retries: 0,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: process.env.NODE_ENV === "development" ? 1 : 15,
      },
    ],
  },
  { event: "workspace/similarities/batch-install.start" },
  async ({ event, step, logger }) => {
    logger.info("# similaritiesBatchEval");

    const supabaseAdmin = newSupabaseRootClient();

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
