import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export const SUPABASE_FILTER_MAX_SIZE = 200;

export type WorkspaceType = Database["public"]["Tables"]["workspaces"]["Row"];

export type ContactType = Database["public"]["Tables"]["contacts"]["Row"];

export type ContactWithCompaniesType = MergeDeep<
  ContactType,
  {
    companies: CompanyType[]; // TODO:
  }
>;

export function isAnHsContactWithCompaniesType(
  obj: any
): obj is ContactWithCompaniesType {
  if (!obj) return false;
  return "id" in obj && "first_name" in obj && "companies" in obj;
}

export type ContactWithCompaniesAndSimilaritiesType = MergeDeep<
  ContactWithCompaniesType,
  {
    contact_similarities: ContactSimilarityType[];
  }
>;

export type CompanyType = Database["public"]["Tables"]["companies"]["Row"];

export type ContactToCompany =
  Database["public"]["Tables"]["contact_companies"]["Row"];

export type ContactSimilarityType =
  Database["public"]["Tables"]["contact_similarities"]["Row"];

export type DupStackType = {
  confident_contact_ids: string[];
  created_at?: string | undefined;
  id: string;
  potential_contact_ids?: string[] | null | undefined;
  workspace_id: string;
};

// TODO: There is the possibility that, when a contact will be deleted, and then the raw_dup_stack_contact associated, there may be an empty dupstack that should be deleted afterward.

export type RawDupStackContactType = {
  dupstack_id: string; // PRIMARY
  contact_id: string; // PRIMARY + UNIQUE
  created_at?: string | undefined;
  workspace_id: string;
  type: "reference" | "confident" | "potential";
};

export type RawDupStackWithContactsType = {
  id: string;
  created_at?: string | undefined;
  workspace_id: string;
  raw_dup_stack_contacts: RawDupStackContactType[];
};

export function RawDupStackToView(raw: RawDupStackWithContactsType) {
  let confident_contact_ids: string[] = [];
  let potential_contact_ids: string[] = [];

  raw.raw_dup_stack_contacts.forEach((contact) => {
    if (contact.type === "reference") {
      confident_contact_ids = [contact.contact_id, ...confident_contact_ids];
    } else if (contact.type === "confident") {
      confident_contact_ids.push(contact.contact_id);
    } else {
      potential_contact_ids.push(contact.contact_id);
    }
  });

  const view: DupStackType = {
    ...raw,
    confident_contact_ids: confident_contact_ids,
    potential_contact_ids: potential_contact_ids,
  };

  return view;
}

export function RawDupStacksToViews(raws: RawDupStackWithContactsType[]) {
  return raws.map((raw) => RawDupStackToView(raw));
}

// export function ViewDupStackToRaw(view: HsRawDupStackWithContactsType) {
//   let confident_contact_ids: string[] = [];
//   let potential_contact_ids: string[] = [];

//   raw.raw_dup_stack_contacts.forEach((contact) => {
//     if (contact.type === "reference") {
//       confident_contact_ids = [contact.contact_id, ...confident_contact_ids];
//     } else if (contact.type === "confident") {
//       confident_contact_ids.push(contact.contact_id);
//     } else {
//       potential_contact_ids.push(contact.contact_id);
//     }
//   });

//   const view: HsDupStackType = {
//     ...raw,
//     confident_contact_ids: confident_contact_ids,
//     potential_contact_ids: potential_contact_ids,
//   };

//   return view;
// }
