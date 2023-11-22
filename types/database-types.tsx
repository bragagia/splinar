import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export const SUPABASE_FILTER_MAX_SIZE = 300;

export type WorkspaceType = MergeDeep<
  Database["public"]["Tables"]["workspaces"]["Insert"],
  {
    installation_status: "FRESH" | "PENDING" | "DONE" | "ERROR";
  }
>;

export type HsContactType =
  Database["public"]["Tables"]["hs_contacts"]["Insert"];

export type HsContactWithCompaniesType = MergeDeep<
  HsContactType,
  {
    hs_companies: HsCompanyType[];
  }
>;

export function isAnHsContactWithCompaniesType(
  obj: any
): obj is HsContactWithCompaniesType {
  if (!obj) return false;
  return "id" in obj && "first_name" in obj && "hs_companies" in obj;
}

export type HsContactWithCompaniesAndSimilaritiesType = MergeDeep<
  HsContactWithCompaniesType,
  {
    hs_contact_similarities: HsContactSimilarityType[];
  }
>;

export type HsCompanyType =
  Database["public"]["Tables"]["hs_companies"]["Insert"];

export type HsContactToHsCompany =
  Database["public"]["Tables"]["hs_contact_companies"]["Insert"];

export type HsContactSimilarityType = MergeDeep<
  Database["public"]["Tables"]["hs_contact_similarities"]["Insert"],
  {
    field_type: "fullname" | "phone" | "email" | "company";
    similarity_score: "exact" | "similar" | "potential" | "unlikely";
  }
>;

export type HsDupStackType = {
  confident_contact_ids: string[];
  created_at?: string | undefined;
  id: string;
  potential_contact_ids?: string[] | null | undefined;
  workspace_id: string;
};

// TODO: There is the possibility that, when a contact will be deleted, and then the raw_dup_stack_contact associated, there may be an empty dupstack that should be deleted afterward.

export type HsRawDupStackContactType = {
  dupstack_id: string; // PRIMARY
  contact_id: string; // PRIMARY + UNIQUE
  created_at?: string | undefined;
  workspace_id: string;
  type: "reference" | "confident" | "potential";
};

export type HsRawDupStackWithContactsType = {
  id: string;
  created_at?: string | undefined;
  workspace_id: string;
  raw_dup_stack_contacts: HsRawDupStackContactType[];
};

export function RawDupStackToView(raw: HsRawDupStackWithContactsType) {
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

  const view: HsDupStackType = {
    ...raw,
    confident_contact_ids: confident_contact_ids,
    potential_contact_ids: potential_contact_ids,
  };

  return view;
}

export function RawDupStacksToViews(raws: HsRawDupStackWithContactsType[]) {
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
