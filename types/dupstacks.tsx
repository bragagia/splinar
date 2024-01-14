// Dupstacks contacts

import { Tables } from "@/types/supabase";
import { MergeDeep } from "type-fest";

// TODO: There is the possibility that, when a contact will be deleted, and then the raw_dup_stack_contact associated, there may be an empty dupstack that should be deleted afterward.

export type DupStackItemWithItemT = MergeDeep<
  Tables<"dup_stack_items">,
  {
    item: Tables<"items"> | null;
  }
>;

export type DupStackWithItemsT = MergeDeep<
  Tables<"dup_stacks">,
  {
    dup_stack_items: DupStackItemWithItemT[];
  }
>;

// ---------
// Dupstacks

// helpers

export function getDupstackReference(dupstack: DupStackWithItemsT) {
  const ref = dupstack.dup_stack_items.find(
    (dup_stack_item) => dup_stack_item.dup_type === "REFERENCE"
  );
  if (!ref) {
    throw new Error("missing reference");
  }
  return ref;
}

export function getDupstackConfidents(dupstack: DupStackWithItemsT) {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) => dup_stack_item.dup_type === "CONFIDENT"
  );
}

export function getDupstackConfidentsAndReference(
  dupstack: DupStackWithItemsT
) {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) =>
      dup_stack_item.dup_type === "CONFIDENT" ||
      dup_stack_item.dup_type === "REFERENCE"
  );
}

export function getDupstackPotentials(dupstack: DupStackWithItemsT) {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) => dup_stack_item.dup_type === "POTENTIAL"
  );
}

export function getDupstackFalsePositives(dupstack: DupStackWithItemsT) {
  return dupstack.dup_stack_items.filter(
    (dup_stack_item) => dup_stack_item.dup_type === "FALSE_POSITIVE"
  );
}
