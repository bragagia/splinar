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

export type ContactWithCompaniesAndSimilaritiesType = MergeDeep<
  ContactWithCompaniesType,
  {
    contact_similarities: ContactSimilarityType[];
  }
>;

export type ContactWithCompaniesAndRawSimilaritiesType = MergeDeep<
  ContactWithCompaniesType,
  {
    similarities_a: ContactSimilarityType[];
    similarities_b: ContactSimilarityType[];
  }
>;

export function isAContactWithCompaniesAndSimilaritiesType(
  obj: any
): obj is ContactWithCompaniesAndSimilaritiesType {
  if (!obj) return false;
  return (
    "id" in obj &&
    "first_name" in obj &&
    "companies" in obj &&
    "contact_similarities" in obj
  );
}

export type CompanyType = Database["public"]["Tables"]["companies"]["Row"];

// Similarities

export type ContactToCompany =
  Database["public"]["Tables"]["contact_companies"]["Row"];

export type ContactSimilarityType =
  Database["public"]["Tables"]["contact_similarities"]["Row"];

// Dupstacks contacts

// TODO: There is the possibility that, when a contact will be deleted, and then the raw_dup_stack_contact associated, there may be an empty dupstack that should be deleted afterward.

type DupStackContactType =
  Database["public"]["Tables"]["dup_stack_contacts"]["Row"];

type DupStackContactWithContactAndCompaniesType = MergeDeep<
  Database["public"]["Tables"]["dup_stack_contacts"]["Row"],
  {
    contact: ContactWithCompaniesType | null;
  }
>;

type DupStackWithContactsIdsType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Row"],
  {
    dup_stack_contacts: DupStackContactType[];
  }
>;

type DupStackContactWithContactType = MergeDeep<
  Database["public"]["Tables"]["dup_stack_contacts"]["Row"],
  {
    contact: ContactType | null;
  }
>;

// Dupstacks

export type DupStackType = Database["public"]["Tables"]["dup_stacks"]["Row"];

export type DupStackWithContactsType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Row"],
  {
    dup_stack_contacts: DupStackContactWithContactType[];
  }
>;

export type DupStackWithContactsAndCompaniesType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Row"],
  {
    dup_stack_contacts: DupStackContactWithContactAndCompaniesType[];
  }
>;

export type DupStackForInsertType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Insert"],
  {
    // note: first item of confident_contact_ids is considered to be the reference contact
    id: string;
    confident_contact_ids: string[];
    potential_contact_ids: string[];
  }
>;

export function getDupstackReference<
  D extends
    | DupStackWithContactsType
    | DupStackWithContactsIdsType
    | DupStackWithContactsAndCompaniesType
>(dupstack: D): D["dup_stack_contacts"][number] {
  return dupstack.dup_stack_contacts.find(
    (dup_stack_contact) => dup_stack_contact.dup_type === "REFERENCE"
  ) as D["dup_stack_contacts"][number];
}

export function getDupstackConfidents<
  D extends
    | DupStackWithContactsType
    | DupStackWithContactsIdsType
    | DupStackWithContactsAndCompaniesType
>(dupstack: D): D["dup_stack_contacts"] {
  return dupstack.dup_stack_contacts.filter(
    (dup_stack_contact) => dup_stack_contact.dup_type === "CONFIDENT"
  );
}

export function getDupstackConfidentsAndReference<
  D extends
    | DupStackWithContactsType
    | DupStackWithContactsIdsType
    | DupStackWithContactsAndCompaniesType
>(dupstack: D): D["dup_stack_contacts"] {
  return dupstack.dup_stack_contacts.filter(
    (dup_stack_contact) =>
      dup_stack_contact.dup_type === "CONFIDENT" ||
      dup_stack_contact.dup_type === "REFERENCE"
  );
}

export function getDupstackPotentials<
  D extends
    | DupStackWithContactsType
    | DupStackWithContactsIdsType
    | DupStackWithContactsAndCompaniesType
>(dupstack: D): D["dup_stack_contacts"] {
  return dupstack.dup_stack_contacts.filter(
    (dup_stack_contact) => dup_stack_contact.dup_type === "POTENTIAL"
  );
}
