import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { DupStackRowInfos } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { URLS } from "@/lib/urls";
import { DupStackContactItemWithContactAndCompaniesType } from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function nextContactsPage(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  nextCursor: string | undefined
) {
  let query = supabase
    .from("dup_stacks")
    .select(
      "*, dup_stack_items:dup_stack_contacts(*, contact:contacts(*, companies(*)))"
    )
    .limit(PAGE_SIZE)
    .eq("workspace_id", workspaceId)
    .eq("item_type", "CONTACTS")
    .order("created_at", { ascending: true });

  if (nextCursor) {
    query = query.gt("created_at", nextCursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let newNextCursor: string | undefined = undefined;
  if (data.length > 0) {
    newNextCursor = data[data.length - 1].created_at;
  }

  return { newDupStacks: data, newNextCursor: newNextCursor };
}

export function getContactCardTitle(
  items: DupStackContactItemWithContactAndCompaniesType[]
) {
  return items.reduce((acc, dupStackContact) => {
    let fullname = (
      (dupStackContact.contact?.first_name || "") +
      " " +
      (dupStackContact.contact?.last_name || "")
    ).trim();

    return fullname.length > acc.length ? fullname : acc;
  }, "");
}

export function sortContactsItems(
  items: DupStackContactItemWithContactAndCompaniesType[]
) {
  return items.sort((a, b) => {
    if (!a.contact || !b.contact) return 0;

    if (a.contact?.filled_score !== b.contact?.filled_score)
      return b.contact.filled_score - a.contact.filled_score;

    return b.contact.hs_id - a.contact.hs_id;
  });
}

export function saveNewContactDupType(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  dupstackId: string,
  itemId: string,
  newDupType: DupItemTypeType
) {
  supabase
    .from("dup_stack_contacts")
    .update({ dup_type: newDupType })
    .eq("workspace_id", workspaceId)
    .eq("contact_id", itemId)
    .eq("dupstack_id", dupstackId)
    .then(); // TODO: error loggin
}

export function getContactRowInfos(
  workspaceHubId: string,
  item: DupStackContactItemWithContactAndCompaniesType
): DupStackRowInfos {
  const contact = item.contact;
  if (!contact) {
    throw new Error("missing contact");
  }

  let fullname = (
    (contact.first_name || "") +
    " " +
    (contact.last_name || "")
  ).trim();

  return {
    dup_type: item.dup_type,
    columns: [
      {
        value: fullname,
        style: "text-black font-medium",
        tips: "Full name",
        hubspotLink: URLS.external.hubspotContact(
          workspaceHubId,
          contact.hs_id
        ),
      },
      {
        value: contact.emails,
        style: "text-gray-700",
        tips: "Emails",
      },
      {
        value: contact.phones,
        style: "text-gray-700",
        tips: "Phone numbers",
      },
      {
        value: contact.companies.map((company) => company.name || ""),
        style: "text-gray-700",
        tips: "Companies",
      },
    ],
  };
}
