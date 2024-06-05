import { Tables } from "@/types/supabase";
import { MergeDeep } from "type-fest";

export function dataCleaningJobRecurrenceToString(
  recurrence: Tables<"data_cleaning_jobs">["recurrence"]
) {
  switch (recurrence) {
    case "each-new-and-updated":
      return "Each created or updated";
    case "each-new":
      return "Each created";
    default:
      return "Unknown";
  }
}

export type DataCleaningJobTemplateT = MergeDeep<
  Omit<
    Tables<"data_cleaning_jobs">,
    "id" | "created_at" | "deleted_at" | "workspace_id" | "last_execution"
  >,
  {
    description: string;
  }
>;
