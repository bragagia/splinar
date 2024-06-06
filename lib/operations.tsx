import { DeepPartial } from "@/lib/deep_partial";
import { mergeDeep } from "@/lib/merge_deep";
import { captureException } from "@/lib/sentry";
import { sleep } from "@/lib/sleep";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { uuid } from "@/lib/uuid";
import {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

export type OperationWorkspaceInstallOrUpdateMetadata = {
  steps: {
    // Only on install
    fetch?: {
      startedAt: string;
      itemsTotal: number;
      itemsDone: number;
    };

    // Only on update
    polling?: {
      startedAt: string;
      total: number;
    };
    jobs?: {
      startedAt: string;
      jobCount: number;
    };

    // Common
    similarities?: {
      startedAt: string;
      batchesStartedAt?: string;
      total?: number;
    };

    dup_stacks?: {
      startedAt: string;
      itemsTotal: number;
      itemsDone: number;
    };
  };

  error?: any;
};

export type OperationGenericMetadata = {
  error?: any;
};

export async function workspaceOperationIncrementStepsDone(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string
) {
  return await _internalIncrementStepsDoneWithRetry(
    supabaseAdmin,
    operationId,
    3
  );
}

export async function workspaceOperationAddStep<T>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  stepsToAdd: number,
  metadataUpdate?: DeepPartial<T>
) {
  await _internalUpdateGeneric(
    supabaseAdmin,
    operationId,
    {},
    metadataUpdate,
    stepsToAdd
  );
}

export async function workspaceOperationUpdateMetadata<T>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  metadataUpdate: DeepPartial<T>
) {
  await _internalUpdateGeneric(supabaseAdmin, operationId, {}, metadataUpdate);
}

export async function WorkspaceOperationUpdateStatus<T>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  newStatus: Tables<"workspace_operations">["ope_status"],
  metadataUpdate?: DeepPartial<T>
) {
  await _internalUpdateGeneric(
    supabaseAdmin,
    operationId,
    {
      ope_status: newStatus,
      done_at:
        newStatus === "DONE" || newStatus === "ERROR"
          ? dayjs().toISOString()
          : undefined,
    },
    metadataUpdate
  );
}

export async function newWorkspaceOperation<T extends Json>(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  ope_type: Tables<"workspace_operations">["ope_type"],
  ope_status: Tables<"workspace_operations">["ope_status"],
  metadata: T,
  steps?: number
) {
  // TODO: Check if running operation for workspace and raise error

  const operation: TablesInsert<"workspace_operations"> = {
    id: uuid(),
    workspace_id: workspaceId,

    created_at: dayjs().toISOString(),
    updated_at: dayjs().toISOString(),
    started_at: dayjs().toISOString(),
    done_at: null,

    ope_type: ope_type,
    ope_status: ope_status,

    steps_done: 0,
    steps_total: steps || 0,
    metadata: metadata,
  };

  console.log("NewWorkspaceOperation ->", JSON.stringify(operation, null, 2));

  const { data: operationRes, error } = await supabaseAdmin
    .from("workspace_operations")
    .insert(operation)
    .select()
    .single();
  if (error) {
    throw error;
  }

  return operationRes;
}

async function _internalIncrementStepsDoneWithRetry(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  retry: number
) {
  const { data: remainingBatches, error: errorIncrement } =
    await supabaseAdmin.rpc("workspace_operations_increment_steps_done", {
      operation_id_arg: operationId,
    });

  if (errorIncrement || remainingBatches == null) {
    const error = errorIncrement || new Error("missing remainingBatches");

    captureException(error);

    if (retry > 0) {
      await sleep(1000);
      return await _internalIncrementStepsDoneWithRetry(
        supabaseAdmin,
        operationId,
        retry - 1
      );
    } else {
      throw error;
    }
  }

  return remainingBatches;
}

async function _internalUpdateGeneric<T>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  update: TablesUpdate<"workspace_operations">,
  metadataUpdate?: DeepPartial<T>,
  stepTotalIncrease?: number
) {
  let constructedUpdate = update;

  if (metadataUpdate || stepTotalIncrease) {
    const { data: operation, error: errorOperation } = await supabaseAdmin
      .from("workspace_operations")
      .select()
      .eq("id", operationId)
      .limit(1)
      .single();
    if (errorOperation || operation === null) {
      throw errorOperation || new Error("missing operation");
    }

    if (metadataUpdate) {
      const newMetadata = mergeDeep(operation.metadata, metadataUpdate);
      constructedUpdate.metadata = newMetadata;
    }

    if (stepTotalIncrease) {
      const newSteps = operation.steps_total + stepTotalIncrease;
      constructedUpdate.steps_total = newSteps;
    }
  }

  console.log(
    "OperationUpdate ->",
    JSON.stringify(
      { id: operationId, ...constructedUpdate, metadata: metadataUpdate },
      null,
      2
    )
  );

  const { error: errorUpdate } = await supabaseAdmin
    .from("workspace_operations")
    .update(update)
    .eq("id", operationId);
  if (errorUpdate) {
    throw errorUpdate;
  }
}

export async function workspaceOperationOnFailureHelper(
  operationId: string,
  stepName: string,
  errorData?: any
) {
  const supabaseAdmin = newSupabaseRootClient();

  const { data: operation, error: errorOperation } = await supabaseAdmin
    .from("workspace_operations")
    .select()
    .eq("id", operationId)
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
      .eq("id", operation.workspace_id);
  }

  await WorkspaceOperationUpdateStatus<OperationGenericMetadata>(
    supabaseAdmin,
    operationId,
    "ERROR",
    {
      error: errorData,
    }
  );

  console.log(
    `##### FAILURE ${stepName} - Workspace: ${operation.workspace_id} - Operation: ${operation.id}`
  );
}

export async function workspaceOperationStartStepHelper<T = Json>(
  operationId: string,
  stepName: string
) {
  const supabaseAdmin = newSupabaseRootClient();

  const { data: operationDb, error: errorOperation } = await supabaseAdmin
    .from("workspace_operations")
    .select("*, workspace:workspaces!inner(*)")
    .eq("id", operationId)
    .limit(1)
    .single();
  if (errorOperation) {
    throw errorOperation;
  }

  if (operationDb.ope_status === "ERROR") {
    throw new Error(
      `##### ABORT ${stepName} - Workspace: ${operationDb.workspace_id} - Operation: ${operationDb.id} -> Operation in error, aborting step`
    );
  }

  const workspace = operationDb.workspace;
  const operation = {
    ...operationDb,
    workspace: undefined,
  };

  console.log(
    `##### START ${stepName} - Workspace: ${workspace.id} - Operation: ${operation.id}`
  );

  return {
    supabaseAdmin,
    operation: { ...operation, metadata: operation.metadata as T },
    workspace,
  };
}

export async function workspaceOperationEndStepHelper(
  operation: Tables<"workspace_operations">,
  stepName: string
) {
  console.log(
    `##### END ${stepName} - Workspace: ${operation.workspace_id} - Operation: ${operation.id}`
  );
}
