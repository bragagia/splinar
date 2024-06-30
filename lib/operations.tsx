import { DeepPartial } from "@/lib/deep_partial";
import { mergeDeep } from "@/lib/merge_deep";
import { captureException } from "@/lib/sentry";
import { sleep } from "@/lib/sleep";
import { newSupabaseRootClient } from "@/lib/supabase/root";
import { uuid } from "@/lib/uuid";
import { Database, Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";
import { MergeDeep } from "type-fest";

export type WorkspaceOperationT<T> = MergeDeep<
  Tables<"workspace_operations">,
  {
    metadata: T;
  }
>;

export type OperationGenericMetadata = {
  error?: any;
};

export type OperationWorkspaceInstallOrUpdateMetadata =
  OperationGenericMetadata & {
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
  };

export type OperationWorkspaceJobExecOnAllMetadata =
  OperationGenericMetadata & {
    jobValidatedId: string;
    progress?: {
      total: number;
      done: number;
    };
  };

export type OperationWorkspaceJobAcceptAllJobLogsMetadata =
  OperationGenericMetadata & {
    jobId: string;
    progress?: {
      total: number;
      done: number;
    };
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

export async function workspaceOperationAddStep<
  T extends OperationGenericMetadata
>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  stepsToAdd: number,
  metadataUpdate?: DeepPartial<T>
) {
  return await _internalUpdateGeneric(
    supabaseAdmin,
    operationId,
    {},
    metadataUpdate,
    stepsToAdd
  );
}

export async function workspaceOperationUpdateMetadata<
  T extends OperationGenericMetadata
>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  metadataUpdate: DeepPartial<T>
) {
  return await _internalUpdateGeneric(
    supabaseAdmin,
    operationId,
    {},
    metadataUpdate
  );
}

export async function WorkspaceOperationUpdateStatus<
  T extends OperationGenericMetadata
>(
  supabaseAdmin: SupabaseClient<Database>,
  operationId: string,
  newStatus: Tables<"workspace_operations">["ope_status"],
  metadataUpdate?: DeepPartial<T>
) {
  return await _internalUpdateGeneric(
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

export async function newWorkspaceOperation<T extends OperationGenericMetadata>(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string,
  ope_type: Tables<"workspace_operations">["ope_type"],
  ope_status: Tables<"workspace_operations">["ope_status"],
  metadata: T,
  option?: {
    linkedObjectId?: string;
    steps?: number;
  }
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
    linked_object_id: option?.linkedObjectId || null,

    steps_done: 0,
    steps_total: option?.steps || 0,
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

  return { ...operationRes, metadata: operationRes.metadata as T };
}

export async function workspaceOperationGetLastOf<
  T extends OperationGenericMetadata
>(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  filters: {
    opeType?: Tables<"workspace_operations">["ope_type"];
    linkedObject?: string;
  }
) {
  let req = supabase
    .from("workspace_operations")
    .select("*")
    .eq("workspace_id", workspaceId);

  if (filters.opeType) {
    req = req.eq("ope_type", filters.opeType);
  }
  if (filters.linkedObject) {
    req = req.eq("linked_object_id", filters.linkedObject);
  }

  const { data, error } = await req
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return { ...data, metadata: data.metadata as T };
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

async function _internalUpdateGeneric<T extends OperationGenericMetadata>(
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

  const { data: updatedOperation, error: errorUpdate } = await supabaseAdmin
    .from("workspace_operations")
    .update(update)
    .eq("id", operationId)
    .select("*")
    .single();
  if (errorUpdate) {
    throw errorUpdate;
  }

  return {
    ...updatedOperation,
    metadata: updatedOperation.metadata as T,
  };
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

export async function workspaceOperationStartStepHelper<
  T extends OperationGenericMetadata,
  OT extends { operationId: string } = { operationId: string }
>(
  eventData: OT,
  stepName: string,
  stepFn: ({
    supabaseAdmin,
    operation,
    workspace,
  }: {
    supabaseAdmin: SupabaseClient<Database>;
    operation: WorkspaceOperationT<T>;
    workspace: Tables<"workspaces">;
  }) => Promise<void>
) {
  const supabaseAdmin = newSupabaseRootClient();

  const { data: operationDb, error: errorOperation } = await supabaseAdmin
    .from("workspace_operations")
    .select("*, workspace:workspaces!inner(*)")
    .eq("id", eventData.operationId)
    .limit(1)
    .single();
  if (errorOperation) {
    throw errorOperation;
  }

  if (operationDb.ope_status === "ERROR") {
    console.log(
      `##### ABORT ${stepName} - Workspace: ${operationDb.workspace_id} - Operation: ${operationDb.id} -> Operation in error, aborting step`
    );
    return;
  }

  const workspace = operationDb.workspace;
  const operation = {
    ...operationDb,
    workspace: undefined,
  };

  console.log(
    `##### START ${stepName} - Workspace: ${workspace.id} - Operation: ${operation.id}`
  );
  console.log("##### ", JSON.stringify(eventData, null, 2));

  await stepFn({
    supabaseAdmin,
    operation: { ...operation, metadata: operation.metadata as any },
    workspace,
  });

  console.log(
    `##### END ${stepName} - Workspace: ${operation.workspace_id} - Operation: ${operation.id}`
  );
}
