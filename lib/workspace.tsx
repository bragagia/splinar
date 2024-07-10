import { DedupConfigT, ItemFieldSourceT } from "@/lib/items_common";
import { Tables } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type ItemTypeDBConfigT = {
  [key: string]:
    | {
        hubspotSourceFields?: ItemFieldSourceT[];
        dedupConfig?: DedupConfigT;
      }
    | undefined;
};

export type WorkspaceT = MergeDeep<
  Tables<"workspaces">,
  {
    item_types: ItemTypeDBConfigT;
  }
>;
