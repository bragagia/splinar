import { ItemTypeT, handleItemDeletion } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import { Database } from "@/types/supabase";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  console.log("HubSpot hook received");
  const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const rawBody = await request.text();

  const URI = "https://app.splinar.com/api/hubspot-hook"; // TODO: Env var
  const requestTimestamp = request.headers
    .get("X-HubSpot-Request-Timestamp")
    ?.toString();
  const signature = request.headers.get("X-HubSpot-Signature-v3")?.toString();

  if (!requestTimestamp || !signature) {
    console.log("HubSpot hook missing signature");
    return NextResponse.json({}, { status: 400 });
  }

  const signatureBaseString = `POST${URI}${rawBody}${requestTimestamp}`;

  const secret = process.env.HUBSPOT_SECRET!;

  // HMAC SHA-256 hash:
  const hmac = createHmac("sha256", secret);
  hmac.update(signatureBaseString);
  const hash = hmac.digest("base64");

  if (hash !== signature) {
    console.log("HubSpot hook signature mismatch");
    return NextResponse.json({}, { status: 400 });
  }

  const body = JSON.parse(rawBody) as HubspotEvent[];

  for (const event of body) {
    try {
      await processHubspotEvent(supabaseAdmin, event);
    } catch (error) {
      captureException(error, { extra: { event } });
    }
  }

  return NextResponse.json({});
}

async function processHubspotEvent(
  supabaseAdmin: SupabaseClient<Database>,
  event: HubspotEvent
) {
  console.log("Processing event", event);

  const { data: workspace, error: workspaceError } = await supabaseAdmin
    .from("workspaces")
    .select()
    .eq("hub_id", event.portalId.toString())
    .single();

  if (workspaceError || !workspace) {
    captureException(
      workspaceError
        ? new Error(
            "Workspace not found: code = " +
              workspaceError.code +
              "; details: " +
              workspaceError.details +
              "; message: " +
              workspaceError.message
          )
        : new Error("Workspace not found")
    );
    return;
  }

  const itemTypeRaw = event.subscriptionType.split(".")[0];
  let itemType: ItemTypeT;
  switch (itemTypeRaw) {
    case "contact":
      itemType = "CONTACTS";
      break;

    case "company":
      itemType = "COMPANIES";
      break;

    default:
      // Unhandled item type for now
      captureException(
        new Error("Unhandled hubspot hook item type: " + itemTypeRaw)
      );
      return;
  }

  const objectId = event.objectId.toString();
  switch (event.subscriptionType) {
    case "contact.creation":
    case "company.creation":
    case "deal.creation":
    case "ticket.creation":
    case "product.creation":
    case "line_item.creation":
      // Handle creation
      break;

    case "contact.deletion":
    case "company.deletion":
    case "deal.deletion":
    case "ticket.deletion":
    case "product.deletion":
    case "line_item.deletion":
    case "contact.privacyDeletion":
      console.log("deleting: ", objectId, itemType);

      // TODO: Separate deletion and privacy deletion so that we can request only for items that are not already merged
      const { data: item, error: itemError } = await supabaseAdmin
        .from("items")
        .select()
        .eq("distant_id", objectId)
        .eq("workspace_id", workspace.id)
        .eq("item_type", itemType)
        .single();
      if (itemError) {
        captureException(itemError);
        return;
      }

      await handleItemDeletion(supabaseAdmin, workspace.id, item.id);

      const isPrivacyDeletion =
        event.subscriptionType === "contact.privacyDeletion";

      let deletionReq = supabaseAdmin
        .from("items")
        .delete()
        .eq("id", item.id)
        .eq("workspace_id", workspace.id);
      if (!isPrivacyDeletion) {
        deletionReq = deletionReq.is("merged_in_distant_id", null);
      }

      const { error: errorDelete } = await deletionReq;

      if (errorDelete) {
        captureException(errorDelete);
        return;
      }

      break;

    case "contact.merge":
    case "company.merge":
    case "deal.merge":
    case "ticket.merge":
    case "product.merge":
    case "line_item.merge":
      const objectIds = event.mergedObjectIds?.map((id) => id.toString()) || [];
      const mergedInId = event.primaryObjectId?.toString() || ""; // TODO: Fetch its data to update it there instead of polling ?

      const { data: items, error: itemMergeError } = await supabaseAdmin
        .from("items")
        .select()
        .in("distant_id", objectIds)
        .eq("workspace_id", workspace.id)
        .eq("item_type", itemType);
      if (itemMergeError) {
        captureException(itemMergeError);
        return;
      }

      let itemsToDelete: string[] = [];
      for (const item of items) {
        if (!item.merged_in_distant_id) {
          // Only delete item if not marked as merged locally
          await handleItemDeletion(supabaseAdmin, workspace.id, item.id);

          itemsToDelete.push(item.id);
        }
      }

      if (itemsToDelete.length === 0) {
        break;
      }

      const { error: errorDeleteMerge } = await supabaseAdmin
        .from("items")
        .delete()
        .in("id", itemsToDelete);

      if (errorDeleteMerge) {
        captureException(errorDeleteMerge);
        return;
      }

      break;

    case "contact.associationChange":
    case "company.associationChange":
    case "deal.associationChange":
    case "ticket.associationChange":
    case "line_item.associationChange":
      // Handle association change
      break;

    case "contact.restore":
    case "company.restore":
    case "deal.restore":
    case "ticket.restore":
    case "product.restore":
    case "line_item.restore":
      // Handle restore
      break;

    case "contact.propertyChange":
    case "company.propertyChange":
    case "deal.propertyChange":
    case "ticket.propertyChange":
    case "product.propertyChange":
    case "line_item.propertyChange":
      // Handle property change

      // const objectId = event.objectId;
      // const property = event.propertyName;
      // const newValue = event.propertyValue;

      // const { error } = await supabaseAdmin.rpc("items_edit_property_json", {
      //   workspace_id_arg: workspace.id,
      //   item_distant_id_arg: objectId.toString(),
      //   json_update: {
      //     [property]: newValue,
      //   },
      // });
      // if (error) {
      //   throw error;
      // }

      // console.log("event:", event);
      // console.log("Property changed", objectId, property, newValue);

      break;
  }
}

type HubspotSubscription =
  | "contact.creation"
  | "contact.deletion"
  | "contact.merge"
  | "contact.associationChange"
  | "contact.restore"
  | "contact.privacyDeletion"
  | "contact.propertyChange"
  | "company.creation"
  | "company.deletion"
  | "company.propertyChange"
  | "company.associationChange"
  | "company.restore"
  | "company.merge"
  | "deal.creation"
  | "deal.deletion"
  | "deal.associationChange"
  | "deal.restore"
  | "deal.merge"
  | "deal.propertyChange"
  | "ticket.creation"
  | "ticket.deletion"
  | "ticket.propertyChange"
  | "ticket.associationChange"
  | "ticket.restore"
  | "ticket.merge"
  | "product.creation"
  | "product.deletion"
  | "product.restore"
  | "product.merge"
  | "product.propertyChange"
  | "line_item.creation"
  | "line_item.deletion"
  | "line_item.associationChange"
  | "line_item.restore"
  | "line_item.merge"
  | "line_item.propertyChange";

/**
 * Represents a HubSpot event.
 */
type HubspotEvent = {
  // COMMON PART

  /**
   * The ID of the object that was created, changed, or deleted. For contacts this is the contact ID; for companies, the company ID; for deals, the deal ID; and for conversations the thread ID.
   */
  objectId: number;
  /**
   * This is only sent for property change subscriptions and is the name of the property that was changed.
   */
  propertyName: string;
  /**
   * This is only sent for property change subscriptions and represents the new value set for the property that triggered the notification.
   */
  propertyValue: string;
  /**
   * The source of the change. This can be any of the change sources that appear in contact property histories.
   */
  changeSource: string;
  /**
   * The ID of the event that triggered this notification. This value is not guaranteed to be unique.
   */
  eventId: number;
  /**
   * The ID of the subscription that triggered a notification about the event.
   */
  subscriptionId: number;
  /**
   * The customer's HubSpot account ID where the event occurred.
   */
  portalId: number;
  /**
   * The ID of your application. This is used in case you have multiple applications pointing to the same webhook URL.
   */
  appId: number;
  /**
   * When this event occurred as a millisecond timestamp.
   */
  occurredAt: number;
  /**
   * The type of event this notification is for. Review the list of supported subscription types in the webhooks subscription section above.
   */
  subscriptionType: HubspotSubscription;
  /**
   * Starting at 0, which number attempt this is to notify your service of this event. If your service times-out or throws an error as describe in the Retries section below, HubSpot will attempt to send the notification again.
   */
  attemptNumber: number;
  /**
   * The ID of the user who triggered the event. This is only sent for events that are triggered by a user action, such as a property change in the CRM UI.
   */
  sourceId: string;

  // MESSAGE PART

  /**
   * This is only sent when a webhook is listening for new messages to a thread. It is the ID of the new message.
   */
  messageId?: number;
  /**
   * This is only sent when a webhook is listening for new messages to a thread. It represents the type of message you're sending. This value can either be MESSAGE or COMMENT.
   */
  messageType?: string;

  // MERGE PART

  /**
   * The ID of the merge winner, which is the record that remains after the merge. In the HubSpot merge UI, this is the record on the right.
   */
  primaryObjectId?: number;
  /**
   * An array of IDs that represent the records that are merged into the merge winner. In the HubSpot merge UI, this is the record on the left.
   */
  mergedObjectIds?: number[];
  /**
   * The ID of the record that is created as a result of the merge. This is separate from primaryObjectId because in some cases a new record is created as a result of the merge.
   */
  newObjectId?: number;
  /**
   * An integer representing how many properties were transferred during the merge.
   */
  numberOfPropertiesMoved?: number;

  // ASSOCIATION CHANGE PART

  /**
   * The type of association, which will be one of the following: CONTACT_TO_COMPANY, CONTACT_TO_DEAL, CONTACT_TO_TICKET, CONTACT_TO_CONTACT, COMPANY_TO_CONTACT, COMPANY_TO_DEAL, COMPANY_TO_TICKET, COMPANY_TO_COMPANY, DEAL_TO_CONTACT, DEAL_TO_COMPANY, DEAL_TO_LINE_ITEM, DEAL_TO_TICKET, DEAL_TO_DEAL, TICKET_TO_CONTACT, TICKET_TO_COMPANY, TICKET_TO_DEAL, TICKET_TO_TICKET, LINE_ITEM_TO_DEAL
   */
  associationType?: string;
  /**
   * The ID of the record that the association change was made from.
   */
  fromObjectId?: number;
  /**
   * The ID of the secondary record in the association event.
   */
  toObjectId?: number;
  /**
   * true: the webhook was triggered by removing an association. false: the webhook was triggered by creating an association.
   */
  associationRemoved?: boolean;
  /**
   * true: the secondary record is the primary association of the record that the association change was made from. false: the record is not the primary association of the record that the association change was made from. Please note: creating a primary association instance between two object records will cause the corresponding non-primary association to also be created. This may result in two webhook messages.
   */
  isPrimaryAssociation?: boolean;
};
