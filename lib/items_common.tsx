import {
  DupStackRowColumnType,
  DupStackRowColumnValueType,
  DupStackRowInfos,
  FacebookLinkButton,
  HubspotLinkButton,
  LinkedinLinkButton,
  StandardLinkButton,
  TwitterLinkButton,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { ItemsListField } from "@/app/workspace/[workspaceId]/duplicates/items-list-field";
import {
  companiesDedupConfig,
  companiesPollUpdater,
  getCompanyColumns,
} from "@/lib/companies";
import { contactsDedupConfig, contactsPollUpdater } from "@/lib/contacts";
import { dateCmp, getMaxs, nullCmp } from "@/lib/metadata_helpers";
import { captureException } from "@/lib/sentry";
import { URLS } from "@/lib/urls";
import {
  DupStackItemWithItemT,
  DupStackWithItemsT,
  getDupstackConfidentsAndReference,
  getDupstackPotentials,
} from "@/types/dupstacks";
import { Database, Tables, TablesInsert, TablesUpdate } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { SupabaseClient } from "@supabase/supabase-js";
import dayjs, { Dayjs } from "dayjs";

export type ItemTypeT = "COMPANIES" | "CONTACTS";

export type ItemConfig = {
  word: string;
  pollUpdater: (
    supabase: SupabaseClient<Database>,
    workspace: Tables<"workspaces">,
    startFilter: Dayjs,
    endFilter: Dayjs,
    after?: string
  ) => Promise<itemPollUpdaterT>;
  dedupConfig: DedupConfigT;
  getHubspotURL: (workspaceHubId: string, distantId: string) => string;
  getDistantMergeFn: (hsClient: Client) => any;
  getWorkspaceOperation: (workspace: Tables<"workspaces">) => string;
  setWorkspaceOperation: (
    newValue: TablesInsert<"workspaces">["contacts_operation_status"],
    workspace?: Tables<"workspaces">
  ) => TablesUpdate<"workspaces">;
};

export type itemPollUpdaterT = {
  items: TablesInsert<"items">[];
  after: string | null;
  lastItemModifiedAt: string | null;
};

export function getItemTypesList(): ItemTypeT[] {
  return ["COMPANIES", "CONTACTS"];
}

export function getItemTypeConfig(itemType: ItemTypeT): ItemConfig {
  if (itemType === "COMPANIES") {
    return {
      word: "companies",

      pollUpdater: companiesPollUpdater,

      dedupConfig: companiesDedupConfig,

      getHubspotURL: URLS.external.hubspotCompany,

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

      pollUpdater: contactsPollUpdater,

      dedupConfig: contactsDedupConfig,

      getHubspotURL: URLS.external.hubspotContact,

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
  const fieldsValues = getItemFieldsValues(item);

  return Object.keys(fieldsValues)
    .map((fieldId) =>
      fieldsValues[fieldId] &&
      (fieldsValues[fieldId].length === undefined ||
        fieldsValues[fieldId].length > 0)
        ? fieldId
        : undefined
    )
    .filter((fieldId) => fieldId !== undefined) as string[];
}

export type DedupConfigT = {
  hubspotSourceFields: ItemFieldSourceT[];
  itemNameSources: string[];
  fields: ItemFieldConfigT[];
  flags: ItemFlagConfigT[];
};

export type ItemFieldSourceT = {
  value: string;
  label: string;
};

export type FieldMergeModeT = "array";

export type ItemFieldConfigT = {
  id: string;
  displayName: string;
  sources: string[];
  matchingMethod: "exact" | "similar" | "name" | "email" | "url";
  nameMinimumLength?: number;
  ifMatch: "confident" | "potential" | "multiplier" | "null";
  ifDifferent:
    | "prevent-match"
    | "prevent-confident-reduce-potential"
    | "reduce-confident-reduce-potential"
    | "reduce-confident"
    | "reduce-potential"
    | "null";
  linkType?:
    | "external"
    | "hubspot"
    | "linkedin"
    | "twitter"
    | "facebook"
    | "item-reference";
};

export type ItemFlagConfigT = {
  id: string;
  flagName: string;
  displayName: string;
  source: string;
  dataType: FieldDataTypeT;
  winner: "highest" | "lowest";
};

type FieldDataTypeT = "number" | "string" | "date";

type fieldSingleValueTypedT<T extends FieldDataTypeT> = T extends "number"
  ? number
  : T extends "string"
  ? string
  : T extends "date"
  ? dayjs.Dayjs
  : never;

type fieldValueTypedT<T extends FieldDataTypeT> =
  | null
  | fieldSingleValueTypedT<T>
  | fieldSingleValueTypedT<T>[];

type fieldValueTypedArrayT<T extends FieldDataTypeT> =
  fieldSingleValueTypedT<T>[];

function getItemSourceTypedSubValueFromString<T extends FieldDataTypeT>(
  value: string,
  type: T
): fieldSingleValueTypedT<T> {
  if (type === "string") {
    return value as fieldSingleValueTypedT<T>;
  } else if (type === "number") {
    return parseFloat(value) as fieldSingleValueTypedT<T>;
  } else {
    //  if (type === "date")
    return dayjs(value) as fieldSingleValueTypedT<T>;
  }
}

function getItemSourceValue<T extends FieldDataTypeT>(
  itemValue: any,
  sourceName: string,
  fieldType: T
): fieldValueTypedT<T> {
  const fieldValue = itemValue[sourceName];

  if (fieldValue === undefined) {
    return null;
  }

  if (
    Array.isArray(fieldValue) &&
    fieldValue.every((value) => {
      return typeof value === "string";
    })
  ) {
    const array = fieldValue as string[];

    return array.map((value) =>
      getItemSourceTypedSubValueFromString(value, fieldType)
    );
  }

  if (typeof fieldValue === "string") {
    return getItemSourceTypedSubValueFromString(fieldValue, fieldType);
  }

  console.log("incorrect field value, expected ", fieldType, ": ", fieldValue);
  return null;
}

export function getItemValueAsArray<T extends FieldDataTypeT>(
  itemValue: any,
  sourceNames: string[],
  fieldType: T
): fieldValueTypedArrayT<T> {
  return sourceNames
    .map((source) => getItemSourceValue(itemValue, source, fieldType))
    .reduce((prev: fieldValueTypedArrayT<T>, cur) => {
      if (!cur) {
        return prev;
      }

      if (Array.isArray(cur)) {
        return prev.concat(...cur);
      }

      return prev.concat(cur);
    }, [] as fieldValueTypedArrayT<T>);
}

// Construct as special field value array that contains all the null values and that does not flatten the array to keep track of the source of the values
export function getItemValueAsNameArray(
  itemValue: any,
  sourceNames: string[]
): (string | null)[] {
  return sourceNames
    .map((source) => getItemSourceValue(itemValue, source, "string"))
    .reduce((prev: (string | null)[], cur) => {
      if (Array.isArray(cur)) {
        return prev.concat(cur.join(" "));
      }

      return prev.concat(cur);
    }, [] as (string | null)[]);
}

export function getItemFieldsValues(item: Tables<"items">) {
  const itemType = getItemTypeConfig(item.item_type);
  const config = itemType.dedupConfig;

  const itemValue = item.value as any;

  let ret: {
    [key: string]: string[];
  } = {};

  for (let field of config.fields) {
    ret[field.id] = getItemValueAsArray(itemValue, field.sources, "string");
  }

  return ret;
}

type ItemFlagValueT = {
  label: string;
  stringValue: string | null;
  value: any;
};

import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

export function getItemFlagsValues(item: Tables<"items">) {
  const itemType = getItemTypeConfig(item.item_type);
  const config = itemType.dedupConfig;

  const itemValue = item.value as any;

  let ret: {
    [key: string]: ItemFlagValueT;
  } = {};

  for (let flag of config.flags) {
    const value = getItemValueAsArray(itemValue, [flag.source], flag.dataType);

    if (value.length === 0) {
      ret[flag.id] = {
        label: flag.displayName,
        stringValue: null,
        value: null,
      };
    } else {
      if (dayjs.isDayjs(value[0])) {
        ret[flag.id] = {
          label: flag.displayName,
          stringValue: value[0].fromNow(),
          value: value[0],
        };
      } else {
        ret[flag.id] = {
          label: flag.displayName,
          stringValue: value[0].toString(),
          value: value[0],
        };
      }
    }
  }

  return ret;
}

function cmpGeneric<T extends FieldDataTypeT>(
  type: T,
  a: fieldSingleValueTypedT<T>,
  b: fieldSingleValueTypedT<T>
): number {
  if (type === "string") {
    const aTyped = a as fieldSingleValueTypedT<"string">;
    const bTyped = b as fieldSingleValueTypedT<"string">;
    return nullCmp(
      aTyped,
      bTyped,
      (aTyped, bTyped) => bTyped.length - aTyped.length
    );
  } else if (type === "number") {
    const aTyped = a as fieldSingleValueTypedT<"number">;
    const bTyped = b as fieldSingleValueTypedT<"number">;
    return nullCmp(aTyped, bTyped, (aTyped, bTyped) => bTyped - aTyped);
  } else {
    //  if (type === "date")
    const aTyped = a as fieldSingleValueTypedT<"date">;
    const bTyped = b as fieldSingleValueTypedT<"date">;
    return nullCmp(aTyped, bTyped, (aTyped, bTyped) => dateCmp(aTyped, bTyped));
  }
}

function getFlagConfigWithColor(flags: ItemFlagConfigT[]) {
  const flagColors = [
    "bg-yellow-50",
    "bg-pink-50",
    "bg-violet-50",
    "bg-lime-50",
    "bg-emerald-50",
  ];

  return flags.map((flag, i) => {
    return {
      ...flag,
      color: flagColors[i % flagColors.length],
    };
  });
}

function getItemStackFlagBestValue(
  dupstack: DupStackWithItemsT,
  flag: ItemFlagConfigT
) {
  const items = dupstack.dup_stack_items
    .filter(
      (dup_stack_item) =>
        dup_stack_item.dup_type === "REFERENCE" ||
        dup_stack_item.dup_type === "CONFIDENT"
    )
    .map((dupstackItem) => dupstackItem.item as Tables<"items">);

  const bestIds = getMaxs(
    items,

    (itemA, itemB) => {
      const Va = getItemValueAsArray(
        itemA.value,
        [flag.source],
        flag.dataType
      )[0];

      const Vb = getItemValueAsArray(
        itemB.value,
        [flag.source],
        flag.dataType
      )[0];

      return (
        nullCmp(Va, Vb, (a, b) => cmpGeneric(flag.dataType, a, b)) *
        (flag.winner === "highest" ? 1 : -1)
      );
    }
  );

  const bestId =
    bestIds.length === 1 &&
    getItemValueAsArray(bestIds[0].value, [flag.source], flag.dataType)[0]
      ? bestIds[0].id
      : null;

  return bestId;
}

export type FlagBestValueT = {
  label: string;
  bestId: string | null;
  color: string;
};

export function getItemStackMetadata(dupstack: DupStackWithItemsT) {
  const itemType = getItemTypeConfig(dupstack.item_type);
  const config = itemType.dedupConfig;

  let stackFlags: FlagBestValueT[] = [];

  for (let flag of getFlagConfigWithColor(config.flags)) {
    const bestId = getItemStackFlagBestValue(dupstack, flag);

    stackFlags.push({
      label: flag.flagName,
      bestId: bestId,
      color: flag.color,
    });
  }

  return stackFlags;
}

function ensureHttpsProtocol(url: string): string {
  // Check if the URL starts with 'http://' or 'https://'
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // Prepend 'https://' to the URL
    return "https://" + url;
  }

  // Return the original URL if it already includes a protocol
  return url;
}

export function getRowInfos(
  workspaceHubId: string,
  dupStackItem: DupStackItemWithItemT,
  stackMetadata: FlagBestValueT[]
): DupStackRowInfos {
  const item = dupStackItem.item;
  if (!item) {
    throw new Error("missing company");
  }

  const itemType = getItemTypeConfig(item.item_type);

  const fieldsValues = getItemFieldsValues(item);

  const fieldColumns: DupStackRowColumnType[] = Object.keys(fieldsValues).map(
    (fieldId): DupStackRowColumnType => {
      const fieldConfig = itemType.dedupConfig.fields.find(
        (fieldConfig) => fieldConfig.id === fieldId
      );
      if (!fieldConfig) {
        throw new Error("Can't find field config from id");
      }

      let fieldValues = fieldsValues[fieldId];

      if (fieldConfig.matchingMethod === "name") {
        fieldValues = [fieldValues.join(" ")];
      }

      let renderedValues: DupStackRowColumnValueType;

      if (!fieldValues || fieldValues.length === 0) {
        renderedValues = null;
      } else if (!fieldConfig.linkType) {
        renderedValues = fieldValues;
      } else if (fieldConfig.linkType === "hubspot") {
        renderedValues = (
          <>
            {fieldValues.map((fieldValue, i) => (
              <HubspotLinkButton
                key={i}
                href={itemType.getHubspotURL(workspaceHubId, item.distant_id)}
              >
                {fieldValue}
              </HubspotLinkButton>
            ))}
          </>
        );
      } else if (fieldConfig.linkType === "external") {
        renderedValues = (
          <>
            {fieldValues.map((fieldValue, i) => (
              <StandardLinkButton
                key={i}
                href={ensureHttpsProtocol(fieldValue)}
              >
                {fieldValue}
              </StandardLinkButton>
            ))}
          </>
        );
      } else if (fieldConfig.linkType === "facebook") {
        renderedValues = (
          <>
            {fieldValues.map((fieldValue, i) => (
              <FacebookLinkButton key={i} href={fieldValue}>
                {fieldValue.replace(/.*facebook\.com\//, "")}
              </FacebookLinkButton>
            ))}
          </>
        );
      } else if (fieldConfig.linkType === "linkedin") {
        renderedValues = (
          <>
            {fieldValues.map((fieldValue, i) => (
              <LinkedinLinkButton key={i} href={fieldValue}>
                {fieldValue.replace(/.*linkedin\.com(\/company)?\//, "")}
              </LinkedinLinkButton>
            ))}
          </>
        );
      } else if (fieldConfig.linkType === "twitter") {
        renderedValues = (
          <>
            {fieldValues.map((fieldValue, i) => (
              <TwitterLinkButton key={i} href={"https://x.com/" + fieldValue}>
                {fieldValue}
              </TwitterLinkButton>
            ))}
          </>
        );
      } else if (fieldConfig.linkType === "item-reference") {
        // TODO: make this generic
        renderedValues = () => (
          <ItemsListField
            itemsDistantIds={fieldValues}
            nameFn={(item: Tables<"items">) =>
              getCompanyColumns(item).name || "#" + item.distant_id
            }
            linkFn={(item: Tables<"items">) =>
              URLS.external.hubspotCompany(workspaceHubId, item.distant_id)
            }
          />
        );
      }

      return {
        value: renderedValues,
        style: "text-gray-700",
        tips:
          itemType.dedupConfig.fields.find((field) => field.id === fieldId)
            ?.displayName || "",
      };
    }
  );

  const flagsValues = getItemFlagsValues(item);

  const itemFlags = stackMetadata.filter((flag) => flag.bestId === item.id);
  const flagColumn = {
    value:
      itemFlags.length > 0 ? (
        <div className="flex flex-col pt-1">
          {itemFlags.map((flag, i) => {
            return (
              <div
                key={i}
                className={`-mt-1 py-1 px-1 border border-gray-400 text-[10px] rounded-md w-fit h-fit leading-none ${flag.color}`}
              >
                {flag.label}
              </div>
            );
          })}
        </div>
      ) : null,
    style: "text-gray-700",
    tips: Object.keys(flagsValues)
      .map((flagId) => {
        const flag = flagsValues[flagId];

        return `${flag.label}: ${
          flag.stringValue !== null ? flag.stringValue : "-"
        }`;
      })
      .join("\n"),
  };

  const columns = fieldColumns
    .slice(0, 3)
    .concat(flagColumn, fieldColumns.slice(3));

  return {
    name: Object.values(fieldsValues)[0].join(" "), // We take the first field as the name
    dup_type: dupStackItem.dup_type,
    columns: columns,
  };
}

export async function handleItemDeletion(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemId: string
) {
  console.log("HandleItemDeletion:", workspaceId, itemId);
  const dupstacks = await getDupstacksOfItem(supabase, workspaceId, itemId);

  if (dupstacks.length === 0) {
    return;
  }

  let dupstackItemsToDelete: Tables<"dup_stack_items">[] = [];
  let dupstackIdsToDelete: string[] = [];

  dupstacks.forEach(async (dupstack) => {
    const dupstackItems = dupstack.dup_stack_items;

    const deletedDupstackItem = dupstackItems.find(
      (dupstackItem) => dupstackItem.item_id === itemId
    );
    if (!deletedDupstackItem) {
      return;
    }

    const deletedItemDupType = deletedDupstackItem?.dup_type;

    if (deletedItemDupType === "FALSE_POSITIVE") {
      dupstackItemsToDelete.push(deletedDupstackItem);
      return;
    }

    const confidentAndReference = getDupstackConfidentsAndReference(dupstack);
    const potentials = getDupstackPotentials(dupstack);

    // If item is a reference, set next confident as reference. If no other confident, remove dup stack.
    if (deletedItemDupType === "REFERENCE") {
      const nextConfident = confidentAndReference.find(
        (dupstackItem) => dupstackItem.dup_type === "CONFIDENT"
      );

      if (nextConfident) {
        const { error } = await supabase
          .from("dup_stack_items")
          .update({ dup_type: "REFERENCE" })
          .eq("dupstack_id", dupstack.id)
          .eq("item_id", nextConfident.item_id);

        if (error) {
          throw error;
        }

        dupstackItemsToDelete.push(deletedDupstackItem);
      } else {
        dupstackIdsToDelete.push(dupstack.id);
      }

      return;
    }

    // If item is confident or potential, remove it from the stack.
    if (
      deletedItemDupType === "CONFIDENT" ||
      deletedItemDupType == "POTENTIAL"
    ) {
      // If remaining dup stack contains only one item, remove the stack.
      if (confidentAndReference.length + potentials.length === 2) {
        dupstackIdsToDelete.push(dupstack.id);
      } else {
        dupstackItemsToDelete.push(deletedDupstackItem);
      }

      return;
    }
  });

  console.log("dupstackItemsToDelete", dupstackItemsToDelete);
  console.log("dupstackIdsToDelete", dupstackIdsToDelete);

  // Remove the item from the items table
  await Promise.all(
    dupstackItemsToDelete.map(async (dupstackItem) => {
      const { error: errorItems } = await supabase
        .from("dup_stack_items")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("dupstack_id", dupstackItem.dupstack_id)
        .eq("item_id", itemId);

      if (errorItems) {
        captureException(errorItems);
        return;
      }
    })
  );

  const { error: errorDupstacks } = await supabase
    .from("dup_stacks")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("id", dupstackIdsToDelete);
  if (errorDupstacks) {
    captureException(errorDupstacks);
  }
}

export async function getDupstacksOfItem(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemId: string
) {
  const { data: dupStackItems, error: errorDupStackItems } = await supabase
    .from("dup_stack_items")
    .select("dupstack_id")
    .eq("workspace_id", workspaceId)
    .eq("item_id", itemId);
  if (errorDupStackItems) {
    throw errorDupStackItems;
  }

  const dupstackIds = dupStackItems.map(
    (dupStackItem) => dupStackItem.dupstack_id
  );

  if (dupstackIds.length === 0) {
    return [];
  }

  const { data: dupStacks, error: errorDupStacks } = await supabase
    .from("dup_stacks")
    .select("*, dup_stack_items(*, item:items(*))")
    .eq("workspace_id", workspaceId)
    .in("id", dupstackIds);

  if (errorDupStacks) {
    throw errorDupStacks;
  }

  return dupStacks;
}
