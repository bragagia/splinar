import {
  OperationWorkspaceInstallOrUpdateMetadata,
  workspaceOperationIncrementStepsDone,
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { rawsql } from "@/lib/supabase/raw_sql";
import { inngest } from "./client";
import console from "console";

export default inngest.createFunction(
  {
    id: "workspace-install-similarities-fast-field",
    retries: 0,
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
        "workspace-install-similarities-fast-field",
        event.data.error
      );
    },
  },
  { event: "workspace/install/similarities-fast/field.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper<OperationWorkspaceInstallOrUpdateMetadata>(
      event.data,
      "workspace-install-similarities-fast-field",
      async ({ supabaseAdmin, workspace, operation }) => {
        const {
          sourceNames: originalSourceNames,
          itemType,
          fieldConfigId,
          matchingMethod,
        } = event.data;

        // If matchingMethod is "name", we concat all sources, else we evaluate each source separately
        let sourceNamesSplit: string[][];
        if (matchingMethod === "name") {
          sourceNamesSplit = [originalSourceNames];
        } else {
          sourceNamesSplit = originalSourceNames.map((sourceField) => [
            sourceField,
          ]);
        }

        for (const sourceNames of sourceNamesSplit) {
          const placeholders = sourceNames.map((_, index) => `$${index + 4}`); // !!! Dynamic placeholders starting from $4 because $1 to $3 are already in use
          const concatenatedDedupedValue = sourceNames
            .map(
              (_, index) => `COALESCE(("value"->>${placeholders[index]}), '')`
            )
            .join(" || ");
          const concatenatedWhereValue = sourceNames
            .map(
              (_, index) =>
                `(("value"->>${placeholders[index]}) IS NOT NULL AND ("value"->>${placeholders[index]}) <> '')`
            )
            .join(" OR ");

          const query = `
      WITH array_data AS (
        SELECT
            CONCAT(${concatenatedDedupedValue}) as deduped_value,
            array_agg(id ORDER BY id) AS dup_items -- ORDER BY id here allow to have always the "first" id in the first column of the pair
        FROM items
        WHERE
            workspace_id = $1
            AND item_type = $2
            AND (${concatenatedWhereValue})
        GROUP BY deduped_value
        HAVING COUNT(id) > 1 AND COUNT(id) < 40
      )
      INSERT INTO similarities (
          workspace_id,
          item_a_id,
          item_b_id,
          field_type,
          item_a_value,
          item_b_value,
          similarity_score
      )
      SELECT
        $1 as workspace_id,
        ad.dup_items[i] AS item_a_id,
        ad.dup_items[j] AS item_b_id,
        $3 as field_type,
        ad.deduped_value as item_a_value,
        ad.deduped_value as item_b_value,
        'exact' as similarity_score
      FROM
        array_data ad,
        LATERAL generate_series(1, cardinality(ad.dup_items) - 1) AS i,
        LATERAL generate_series(i + 1, cardinality(ad.dup_items)) AS j
      ON CONFLICT (workspace_id, item_a_id, item_b_id, field_type) DO UPDATE
      SET
          item_a_value = EXCLUDED.item_a_value,
          item_b_value = EXCLUDED.item_b_value,
          similarity_score = EXCLUDED.similarity_score;
      `;

          console.log(query);

          await rawsql(
            query,
            workspace.id,
            itemType,
            fieldConfigId,
            ...sourceNames
          );
        }

        const remainingFields = await workspaceOperationIncrementStepsDone(
          supabaseAdmin,
          operation.id
        );
        console.log("-> remainingFields:", remainingFields);

        if (remainingFields === 0) {
          await inngest.send({
            name: "workspace/install/dupstacks.start",
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
