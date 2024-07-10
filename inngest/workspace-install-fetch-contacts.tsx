import { fetchContacts } from "@/inngest/workspace-install-fetch/contacts";
import { newHubspotClient } from "@/lib/hubspot";
import {
  workspaceOperationOnFailureHelper,
  workspaceOperationStartStepHelper,
} from "@/lib/operations";
import { inngest } from "./client";

export default inngest.createFunction(
  {
    id: "workspace-install-fetch-contacts",
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
        "workspace-install-fetch-contacts",
        event.data.error
      );
    },
  },
  { event: "workspace/install/fetch/contacts.start" },
  async ({ event, step, logger }) => {
    await workspaceOperationStartStepHelper(
      event.data,
      "workspace-install-fetch-contacts",
      async ({ supabaseAdmin, workspace, operation }) => {
        let hsClient = await newHubspotClient(workspace.refresh_token);

        await fetchContacts(
          hsClient,
          supabaseAdmin,
          workspace,
          operation.id,
          event.data.after
        );
      }
    );
  }
);
