// Dupstacks contacts

import { CompanyType } from "@/types/companies";
import { ContactWithCompaniesType } from "@/types/contacts";
import { Database } from "@/types/supabase";
import { MergeDeep } from "type-fest";

// TODO: There is the possibility that, when a contact will be deleted, and then the raw_dup_stack_contact associated, there may be an empty dupstack that should be deleted afterward.

export type DupStackItemBase = Omit<
  Database["public"]["Tables"]["dup_stack_contacts"]["Row"],
  "contact_id"
>;

export type InsertDupStackContactItemType =
  Database["public"]["Tables"]["dup_stack_contacts"]["Insert"];

export type DupStackContactItemWithContactAndCompaniesType = MergeDeep<
  Database["public"]["Tables"]["dup_stack_contacts"]["Row"],
  {
    contact: ContactWithCompaniesType | null;
  }
>;

export type InsertDupStackCompanyItemType =
  Database["public"]["Tables"]["dup_stack_companies"]["Insert"];

export type DupStackCompanyItemWithCompanyType = MergeDeep<
  Database["public"]["Tables"]["dup_stack_companies"]["Row"],
  {
    company: CompanyType | null;
  }
>;

// ---------
// Dupstacks

export type DupStackType = Database["public"]["Tables"]["dup_stacks"]["Row"];

export type InsertDupStackType =
  Database["public"]["Tables"]["dup_stacks"]["Insert"];

// helpers

export type DupStackWithCompaniesType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Row"],
  {
    dup_stack_items: DupStackCompanyItemWithCompanyType[];
  }
>;

export type DupStackWithContactsAndCompaniesType = MergeDeep<
  Database["public"]["Tables"]["dup_stacks"]["Row"],
  {
    dup_stack_items: DupStackContactItemWithContactAndCompaniesType[];
  }
>;

export function getDupstackReference<
  ItemT extends DupStackItemBase,
  D extends MergeDeep<
    DupStackType,
    {
      dup_stack_items: ItemT[];
    }
  >
>(dupstack: D): D["dup_stack_items"][number] {
  return dupstack.dup_stack_items.find(
    (dup_stack_item) => dup_stack_item.dup_type === "REFERENCE"
  ) as D["dup_stack_items"][number];
}

export function getDupstackConfidents<
  ItemT extends DupStackItemBase,
  D extends MergeDeep<
    DupStackType,
    {
      dup_stack_items: ItemT[];
    }
  >
>(dupstack: D): D["dup_stack_items"] {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) => dup_stack_item.dup_type === "CONFIDENT"
  );
}

export function getDupstackConfidentsAndReference<
  ItemT extends DupStackItemBase,
  D extends MergeDeep<
    DupStackType,
    {
      dup_stack_items: ItemT[];
    }
  >
>(dupstack: D): D["dup_stack_items"] {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) =>
      dup_stack_item.dup_type === "CONFIDENT" ||
      dup_stack_item.dup_type === "REFERENCE"
  );
}

export function getDupstackPotentials<
  ItemT extends DupStackItemBase,
  D extends MergeDeep<
    DupStackType,
    {
      dup_stack_items: ItemT[];
    }
  >
>(dupstack: D): D["dup_stack_items"] {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) => dup_stack_item.dup_type === "POTENTIAL"
  );
}
