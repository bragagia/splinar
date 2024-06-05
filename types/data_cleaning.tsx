import { Tables } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export type DataCleaningJobWithValidated = MergeDeep<
  Tables<"data_cleaning_jobs">,
  {
    data_cleaning_job_validated: Tables<"data_cleaning_job_validated">[];
  }
>;
