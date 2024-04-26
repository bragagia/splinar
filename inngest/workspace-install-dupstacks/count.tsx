import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationUpdateMetadata,
} from "@/lib/operations";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

export async function updateDupStackInstallationTotal(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string
) {
  const { count: dupTotalContacts, error: errorContacts } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false)
    .limit(0);
  if (errorContacts || dupTotalContacts === null) {
    throw errorContacts || new Error("missing count on contacts");
  }

  await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
    supabase,
    operationId,
    {
      steps: {
        dup_stacks: {
          startedAt: dayjs().toISOString(),
          itemsTotal: dupTotalContacts,
          itemsDone: 0,
        },
      },
    }
  );

  console.log("-> Items dup total: ", dupTotalContacts);
}

export async function updateDupStackInstallationDone(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  operationId: string
) {
  const { data: operation, error: errorOperation } = await supabase
    .from("workspace_operations")
    .select()
    .eq("id", operationId)
    .limit(1)
    .single();
  if (errorOperation || operation === null) {
    throw errorOperation || new Error("missing operation");
  }

  const { count: dupContactsRemaining, error: errorContacts } = await supabase
    .from("items")
    .select(undefined, { count: "exact", head: true })
    .is("merged_in_distant_id", null)
    .eq("workspace_id", workspaceId)
    .eq("similarity_checked", true)
    .eq("dup_checked", false)
    .limit(0);
  if (errorContacts || dupContactsRemaining === null) {
    throw errorContacts || new Error("missing count");
  }

  const metadata =
    operation.metadata as OperationWorkspaceInstallOrUpdateMetadata;

  const dupContactsDone =
    (metadata.steps.dup_stacks?.itemsTotal || 0) - dupContactsRemaining;

  await workspaceOperationUpdateMetadata<OperationWorkspaceInstallOrUpdateMetadata>(
    supabase,
    operationId,
    {
      steps: {
        dup_stacks: {
          itemsDone: dupContactsDone,
        },
      },
    }
  );

  console.log(
    "-> Dup stack items done:",
    dupContactsDone,
    "/",
    metadata.steps.dup_stacks?.itemsTotal
  );
}
