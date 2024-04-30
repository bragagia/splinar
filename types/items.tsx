import { Tables, TablesInsert } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type ItemWithSimilaritiesType = MergeDeep<
  Tables<"items">,
  {
    similarities: TablesInsert<"similarities">[];
  }
>;

export type ItemWithRawSimilaritiesType = MergeDeep<
  Tables<"items">,
  {
    similarities_a: TablesInsert<"similarities">[];
    similarities_b: TablesInsert<"similarities">[];
  }
>;
