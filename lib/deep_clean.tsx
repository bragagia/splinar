import { Json } from "@/types/supabase";
import { findAndReplaceIf } from "find-and-replace-anything";

export function deepClean(obj: Json): Json {
  return findAndReplaceIf(obj, (value: any) => {
    if (value === null || value === undefined) {
      return value;
    }
    if (typeof value === "string") {
      return value.replaceAll("\0", "");
    }
    return value;
  }) as Json;
}
