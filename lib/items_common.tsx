import {
  companiesSimilarityCheck,
  companyScoring,
  getCompanyColumns,
  getCompanyRowInfos,
  getCompanyStackMetadata,
} from "@/lib/companies";
import {
  contactScoring,
  contactSimilarityCheck,
  getContactColumns,
  getContactRowInfos,
  getContactStackMetadata,
} from "@/lib/contacts";
import { Tables, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";

export type itemTypeT = "COMPANIES" | "CONTACTS";

export function getItemTypesList(): itemTypeT[] {
  return ["COMPANIES", "CONTACTS"];
}

export function getItemType(itemType: itemTypeT) {
  if (itemType === "COMPANIES") {
    return {
      word: "companies",

      getColumns: getCompanyColumns,

      getRowInfos: getCompanyRowInfos,

      similarityCheck: companiesSimilarityCheck,

      dupScoring: companyScoring,

      getStackMetadata: getCompanyStackMetadata,

      getDistantMergeFn: (hsClient: Client) =>
        hsClient?.crm.companies.publicObjectApi.merge,

      getWorkspaceOperation: (workspace: Tables<"workspaces">) =>
        workspace.companies_operation_status,

      setWorkspaceOperation: (
        newValue: TablesInsert<"workspaces">["contacts_operation_status"],
        workspace?: Tables<"workspaces">
      ) => ({ ...workspace, companies_operation_status: newValue }),
    };
  } else {
    return {
      word: "contacts",

      getColumns: getContactColumns,

      getRowInfos: getContactRowInfos,

      similarityCheck: contactSimilarityCheck,

      dupScoring: contactScoring,

      getStackMetadata: getContactStackMetadata,

      getDistantMergeFn: (hsClient: Client) =>
        hsClient?.crm.contacts.publicObjectApi.merge,

      getWorkspaceOperation: (workspace: Tables<"workspaces">) =>
        workspace.contacts_operation_status,

      setWorkspaceOperation: (
        newValue: TablesInsert<"workspaces">["contacts_operation_status"],
        workspace?: Tables<"workspaces">
      ) => ({ ...workspace, contacts_operation_status: newValue }),
    };
  }
}

export function listItemFields(item: Tables<"items">) {
  const columns = getItemType(item.item_type).getColumns(item) as {
    [key: string]: any;
  };

  return Object.keys(columns)
    .map((columnKey) =>
      columns[columnKey] &&
      (columns[columnKey].length === undefined || columns[columnKey].length > 0)
        ? columnKey
        : undefined
    )
    .filter((key) => key) as string[];
}
