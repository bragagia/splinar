import { inngest } from "@/inngest";
import { calcContactFilledScore } from "@/inngest/dedup/list-contact-fields";
import { uuid } from "@/lib/uuid";
import { CompanyType } from "@/types/companies";
import { Database } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";

const UPDATE_COUNT_EVERY = 3;

async function convertHubIdToInternalId(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsToCompanies: {
    company_hub_id: string;
    contact_id: string;
    workspace_id: string;
  }[]
) {
  const { data: companies, error } = await supabase
    .from("companies")
    .select()
    .eq("workspace_id", workspaceId)
    .in(
      "hs_id",
      contactsToCompanies.map((cTc) => cTc.company_hub_id)
    );
  if (error) {
    throw error;
  }

  let companiesByHsId: { [key: string]: CompanyType } = {};
  companies.forEach((c) => {
    companiesByHsId[c.hs_id] = c;
  });

  return contactsToCompanies.map((cTc) => ({
    workspace_id: workspaceId,
    contact_id: cTc.contact_id,
    company_id: companiesByHsId[cTc.company_hub_id].id,
  }));
}

export async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  after?: string
) {
  let pageId = 0;

  do {
    pageId++;

    if (pageId % UPDATE_COUNT_EVERY === 0) {
      await updateInstallCount(supabase, workspaceId);

      await inngest.send({
        name: "workspace/contacts/fetch.start",
        data: {
          workspaceId: workspaceId,
          after: after,
        },
      });

      return;
    }

    console.log("Fetching contact page ", after);

    const res = await hsClient.crm.contacts.basicApi.getPage(
      100,
      after,
      ["email", "firstname", "lastname", "phone", "mobilephone"],
      undefined,
      ["companies"]
    );

    after = res.paging?.next?.after;

    const contacts = res.results;

    if (!contacts || contacts.length === 0) {
      break;
    }

    let contactsToCompanies: {
      company_hub_id: string;
      contact_id: string;
      workspace_id: string;
    }[] = [];
    let dbContacts = contacts.map((contact) => {
      let dbContact = {
        id: uuid(),
        workspace_id: workspaceId,
        hs_id: parseInt(contact.id),

        first_name: contact.properties.firstname,
        last_name: contact.properties.lastname,
        phones: [
          contact.properties.mobilephone,
          contact.properties.phone,
        ].filter((v) => v !== null && v !== undefined) as string[],
        emails: [contact.properties.email].filter(
          (v) => v !== null && v !== undefined
        ) as string[],
        similarity_checked: false,
        dup_checked: false,
        filled_score: 0, // Calculated below
        // TODO: company_name: contact.properties.???,
      };

      let contactCompanies = contact.associations?.companies?.results
        ?.filter((company) => company.type == "contact_to_company_unlabeled")
        .map((company) => ({
          workspace_id: workspaceId,
          contact_id: dbContact.id,
          company_hub_id: company.id,
        }));

      if (contactCompanies) {
        contactsToCompanies.push(...contactCompanies);
      }

      dbContact.filled_score = calcContactFilledScore(
        dbContact,
        contactCompanies && contactCompanies?.length > 0 ? true : false
      );

      return dbContact;
    });

    let { error: errorContact } = await supabase
      .from("contacts")
      .insert(dbContacts);
    if (errorContact) {
      throw errorContact;
    }

    const dbContactToCompanies = await convertHubIdToInternalId(
      supabase,
      workspaceId,
      contactsToCompanies
    );

    let { error: errorContactCompanies } = await supabase
      .from("contact_companies")
      .insert(dbContactToCompanies);
    if (errorContactCompanies) {
      throw errorContactCompanies;
    }
  } while (after);

  // Final update
  await updateInstallCount(supabase, workspaceId);

  // End of general fetching
  await supabase
    .from("workspaces")
    .update({ installation_fetched: true })
    .eq("id", workspaceId);

  await inngest.send({
    name: "workspace/all/fetch.finished",
    data: {
      workspaceId: workspaceId,
    },
  });
}

async function updateInstallCount(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  const contacts = await supabase
    .from("contacts")
    .select("", { count: "exact" })
    .eq("workspace_id", workspaceId);
  if (contacts.error) {
    throw contacts.error;
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      installation_contacts_count: contacts.count || 0,
    })
    .eq("id", workspaceId);
  if (error) {
    throw error;
  }
}
