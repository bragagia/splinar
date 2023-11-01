import { Database } from "@/types/supabase";
import {
  HsCompanyType,
  HsContactToHsCompany,
  HsContactType,
} from "@/utils/database-types";
import { calcContactFilledScore } from "@/utils/dedup/utils/list-contact-fields";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

export async function fetchContacts(
  hsClient: Client,
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  allCompanies: HsCompanyType[]
) {
  const contacts = await hsClient.crm.contacts.getAll(
    undefined,
    undefined,
    ["email", "firstname", "lastname", "phone", "mobilephone"],
    undefined,
    ["companies"]
  );

  let companyByHsId: { [key: string]: HsCompanyType } = {};
  allCompanies.forEach((company) => {
    companyByHsId[company.hs_id] = company;
  });

  let contactsToCompanies: HsContactToHsCompany[] = [];
  let dbContacts = contacts.map((contact) => {
    let dbContact: HsContactType = {
      id: nanoid(),
      workspace_id: workspaceId,
      hs_id: contact.id,

      first_name: contact.properties.firstname,
      last_name: contact.properties.lastname,
      phones: [contact.properties.mobilephone, contact.properties.phone].filter(
        (v) => v !== null && v !== undefined
      ) as string[],
      emails: [contact.properties.email].filter(
        (v) => v !== null && v !== undefined
      ) as string[],
      similarity_checked: false,
      dup_checked: false,
      filled_score: 0, // Calculated below
      // TODO: company_name: contact.properties.???,
    };

    let dbContactCompanies: HsContactToHsCompany[] | undefined =
      contact.associations?.companies?.results
        ?.filter((company) => company.type == "contact_to_company_unlabeled")
        .map((company) => ({
          workspace_id: workspaceId,
          hs_contact_id: dbContact.id,
          hs_company_id: companyByHsId[company.id].id,
        }));

    if (dbContactCompanies) {
      contactsToCompanies.push(...dbContactCompanies);
    }

    dbContact.filled_score = calcContactFilledScore(
      dbContact,
      dbContactCompanies && dbContactCompanies?.length > 0 ? true : false
    );

    return dbContact;
  });

  let { error: errorContact } = await supabase
    .from("hs_contacts")
    .insert(dbContacts);
  if (errorContact) {
    throw errorContact;
  }

  let { error: errorContactCompanies } = await supabase
    .from("hs_contact_companies")
    .insert(contactsToCompanies);
  if (errorContactCompanies) {
    throw errorContactCompanies;
  }
}
