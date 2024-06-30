import {
  updateDupStackInstallationDone,
  updateDupStackInstallationTotal,
} from "@/inngest/workspace-install-dupstacks/count";
import { resolveNextDuplicatesStack } from "@/inngest/workspace-install-dupstacks/resolve-next-dup-stack";
import {
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-dupstacks",
    retries: 3,
    concurrency: [
      {
        scope: "account",
        key: "event.data.workspaceId",
        limit: 1,
      },
    ],
    onFailure: async ({ event, error }) => {
      await workspaceOperationOnFailureHelper(
        event.data.event.data.operationId,
        "workspace-install-dupstacks",
        event.data.error
      );
    },
  },
  { event: "workspace/install/dupstacks.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-dupstacks",
      async ({ supabaseAdmin, workspace, operation }) => {
        if (!event.data.secondRun) {
          await workspaceInstallDupstackFirstRun(
            supabaseAdmin,
            workspace.id,
            operation.id
          );
        }

        let counter = 0;
        let now = performance.now();
        const intervalCallback = 25;
        const intervalStop = 50;
        let hasMore = true;

        while (hasMore) {
          const hasFoundContact = await resolveNextDuplicatesStack(
            supabaseAdmin,
            workspace.id
          );
          if (!hasFoundContact) {
            await updateDupStackInstallationDone(
              supabaseAdmin,
              workspace.id,
              operation.id
            );

            hasMore = false;
            break;
          }

          counter++;
          const elapsed = performance.now() - now;

          if (counter % intervalCallback === 0 || elapsed >= 15000) {
            await updateDupStackInstallationDone(
              supabaseAdmin,
              workspace.id,
              operation.id
            );
          }

          if (counter % intervalStop === 0 || elapsed >= 15000) {
            break;
          }
        }

        if (hasMore) {
          await inngest.send({
            name: "workspace/install/dupstacks.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
              secondRun: true,
            },
          });
        } else {
          await inngest.send({
            name: "workspace/install/end.start",
            data: {
              workspaceId: workspace.id,
              operationId: operation.id,
            },
          });
        }
      }
    );
  }
);

export async function workspaceInstallDupstackFirstRun(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string
) {
  console.info("-> First dupstack run");

  console.info("-> Updating installation total");
  await updateDupStackInstallationTotal(
    supabaseAdmin,
    workspaceId,
    operationId
  );
}
