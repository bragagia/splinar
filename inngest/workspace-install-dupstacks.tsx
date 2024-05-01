import {
  updateDupStackInstallationDone,
  updateDupStackInstallationTotal,
} from "@/inngest/workspace-install-dupstacks/count";
import { resolveNextDuplicatesStack } from "@/inngest/workspace-install-dupstacks/resolve-next-dup-stack";
import {
  OperationWorkspaceInstallOrUpdateMetadata,
  WorkspaceOperationUpdateStatus,
} from "@/lib/operations";
import { newSupabaseRootClient } from "@/lib/supabase/root";
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
      const supabaseAdmin = newSupabaseRootClient();

      const { data: operation, error: errorOperation } = await supabaseAdmin
        .from("workspace_operations")
        .select()
        .eq("id", event.data.event.data.operationId)
        .limit(1)
        .single();
      if (errorOperation || !operation) {
        throw errorOperation || new Error("missing operation");
      }

      if (operation.ope_type === "WORKSPACE_INSTALL") {
        await supabaseAdmin
          .from("workspaces")
          .update({
            installation_status: "ERROR",
          })
          .eq("id", event.data.event.data.workspaceId);
      }

      await WorkspaceOperationUpdateStatus<OperationWorkspaceInstallOrUpdateMetadata>(
        supabaseAdmin,
        event.data.event.data.operationId,
        "ERROR",
        {
          error: event.data.error,
        }
      );
    },
  },
  { event: "workspace/install/dupstacks.start" },
  async ({ event, step, logger }) => {
    const { workspaceId, operationId } = event.data;

    logger.info("# Workspace dups install", workspaceId);

    const supabaseAdmin = newSupabaseRootClient();

    if (!event.data.secondRun) {
      await workspaceInstallDupstackFirstRun(
        supabaseAdmin,
        workspaceId,
        operationId
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
        workspaceId
      );
      if (!hasFoundContact) {
        await updateDupStackInstallationDone(
          supabaseAdmin,
          workspaceId,
          operationId
        );

        hasMore = false;
        break;
      }

      counter++;
      const elapsed = performance.now() - now;

      if (counter % intervalCallback === 0 || elapsed >= 15000) {
        await updateDupStackInstallationDone(
          supabaseAdmin,
          workspaceId,
          operationId
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
          workspaceId: workspaceId,
          operationId: operationId,
          secondRun: true,
        },
      });
    } else {
      await inngest.send({
        name: "workspace/install/end.start",
        data: {
          workspaceId: workspaceId,
          operationId: operationId,
        },
      });
    }

    logger.info("# Workspace dups install", workspaceId, "- END");
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
