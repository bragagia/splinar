import { fetchCompanies } from "@/inngest/workspace-install-fetch/companies";
import { newHubspotClient } from "@/lib/hubspot";
import {
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-fetch-companies",
    retries: 5,
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
        "workspace-install-fetch-companies",
        event.data.error
      );
    },
  },
  { event: "workspace/install/fetch/companies.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-fetch-companies",
      async ({ supabaseAdmin, workspace, operation }) => {
        let hsClient = await newHubspotClient(workspace.refresh_token);

        await fetchCompanies(
          hsClient,
          supabaseAdmin,
          workspace.id,
          operation.id,
          event.data.after
        );
      }
    );
  }
);
