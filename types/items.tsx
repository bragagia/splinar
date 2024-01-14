import { Tables } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type ItemWithSimilaritiesType = MergeDeep<
  Tables<"items">,
  {
    similarities: Tables<"similarities">[];
  }
>;

export type ItemWithRawSimilaritiesType = MergeDeep<
  Tables<"items">,
  {
    similarities_a: Tables<"similarities">[];
    similarities_b: Tables<"similarities">[];
  }
>;

export type ItemLink = {
  id: string;
};
