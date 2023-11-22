import { HsContactType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { calcContactFilledScore } from "@/utils/dedup/list-contact-fields";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { HsCompanyType } from "../../../types/database-types";

async function convertHubIdToInternalId(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  contactsToCompanies: {
    company_hub_id: string;
    hs_contact_id: string;
    workspace_id: string;
  }[]
) {
  const { data: companies, error } = await supabase
    .from("hs_companies")
    .select()
    .eq("workspace_id", workspaceId)
    .in(
      "hs_id",
      contactsToCompanies.map((c) => c.company_hub_id)
    );
  if (error) {
    throw error;
  }

  let companiesByHsId: { [key: string]: HsCompanyType } = {};
  companies.forEach((c) => {
    companiesByHsId[c.hs_id] = c;
  });

  return contactsToCompanies.map((cTc) => ({
    workspace_id: workspaceId,
    hs_contact_id: cTc.hs_contact_id,
    hs_company_id: companiesByHsId[cTc.company_hub_id].id,
  }));
}

export async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  let after: string | undefined = undefined;
  let pageId = 0;

  do {
    pageId++;
    console.log("Fetching contact page ", pageId);

    const res = await hsClient.crm.contacts.basicApi.getPage(
      100,
      after,
      ["email", "firstname", "lastname", "phone", "mobilephone"],
      undefined,
      ["companies"]
    );

    after = res.paging?.next?.after;

    const contacts = res.results;

    let contactsToCompanies: {
      company_hub_id: string;
      hs_contact_id: string;
      workspace_id: string;
    }[] = [];
    let dbContacts = contacts.map((contact) => {
      let dbContact: HsContactType = {
        id: nanoid(),
        workspace_id: workspaceId,
        hs_id: contact.id,

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
          hs_contact_id: dbContact.id,
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
      .from("hs_contacts")
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
      .from("hs_contact_companies")
      .insert(dbContactToCompanies);
    if (errorContactCompanies) {
      throw errorContactCompanies;
    }
  } while (after);
}
