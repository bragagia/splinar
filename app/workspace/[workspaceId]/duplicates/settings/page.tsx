"use client";

import { workspaceReset } from "@/app/workspace/[workspaceId]/settings/workspace-reset";
import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  SpButton,
  SpConfirmButton,
  SpIconButton,
} from "@/components/sp-button";
import { SpTooltip } from "@/components/sp-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multiselect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DedupConfigT,
  ItemConfig,
  ItemFieldConfigT,
  ItemTypeT,
  getItemTypeConfig,
  mergeItemConfig,
} from "@/lib/items_common";
import { mergeDeep } from "@/lib/merge_deep";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { uuid } from "@/lib/uuid";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type TypeStateT = {
  word: string;
  config: DedupConfigT;
};

export default function WorkspaceSettingsPage() {
  const workspace = useWorkspace();
  const user = useUser();
  const supabase = newSupabaseBrowserClient();

  const searchParams = useSearchParams();
  const itemType = searchParams.get("itemType") as ItemTypeT;

  const itemTypeConfig = useMemo(
    () => getItemTypeConfig(workspace, itemType),
    [itemType, workspace]
  );

  const [fields, setFields] = useState(itemTypeConfig?.dedupConfig?.fields);

  const handleChange = (index: number, newField: ItemFieldConfigT) => {
    const newFields = [...fields];
    newFields[index] = newField;

    setFields(newFields);
  };

  const handleNewField = () => {
    const newFields = [...fields];
    newFields.push({
      id: uuid(),
      displayName: "",
      sources: [],
      matchingMethod: "exact",
      ifMatch: "null",
      ifDifferent: "null",
      fastSimilaritiesCompatible: true,
      nameMinimumLength: 2,
    });

    setFields(newFields);
  };

  const handleDeleteField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);

    setFields(newFields);
  };

  const handleSave = async () => {
    const updatedItemConfig = mergeItemConfig(workspace, itemType, {
      dedupConfig: {
        fields: fields,
        flags: itemTypeConfig.dedupConfig.flags,
      },
    });

    const { error: errorWorkspaceUpdate } = await supabase
      .from("workspaces")
      .update({
        item_types: updatedItemConfig,
      })
      .eq("id", workspace.id);
    if (errorWorkspaceUpdate) {
      throw errorWorkspaceUpdate;
    }

    await workspaceReset(workspace.id, "similarities_and_dup");
  };

  if (!itemTypeConfig) {
    return (
      <div className="w-full flex items-center justify-center h-52">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          <Link href={URLS.workspace(workspace.id).duplicates}>
            <Icons.chevronLeft className="h-8 w-8 inline mb-1 text-gray-400 font-light" />
            Duplicates
          </Link>

          <span className="text-gray-400 font-light mx-2">/</span>

          <span>{itemTypeConfig.word} rules</span>
        </h2>
      </div>

      <div className="bg-orange-100 px-2 py-6 rounded-md text-sm">
        <p className="text-center">
          ⚠️ The settings for duplicate rules are currently read-only. If the
          default settings do not meet your needs, please contact us for
          assistance.
        </p>
      </div>

      <Card>
        <CardContent className="pt-2">
          <FieldsHeader />
          {fields.map((field, i) => (
            <FieldEditor
              key={field.id}
              config={itemTypeConfig}
              field={field}
              onChange={(newField) => handleChange(i, newField)}
              onDelete={() => handleDeleteField(i)}
            />
          ))}

          <div className="flex flex-row w-full gap-2 justify-center mt-2">
            <SpButton
              variant="outline"
              className="w-full"
              icon={Icons.add}
              onClick={handleNewField}
            >
              New
            </SpButton>

            {(user.role === "SUPERADMIN" ||
              process.env.NODE_ENV === "development") && (
              <SpConfirmButton
                variant="full"
                className="w-full"
                colorClass="red"
                onClick={handleSave}
              >
                Save and reset similarities
              </SpConfirmButton>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldTitle({ name, tooltip }: { name: string; tooltip?: string }) {
  if (!tooltip) {
    return (
      <div className="flex flex-row items-center justify-center">
        <span className="text-sm text-center">{name}</span>
      </div>
    );
  }

  return (
    <SpTooltip
      className="flex flex-row gap-2 items-center justify-center w-full"
      tooltip={tooltip}
      align="center"
    >
      <span className="text-sm text-center">{name}</span>

      <Icons.infos className="w-4 h-4 text-gray-400 shrink-0" />
    </SpTooltip>
  );
}

function FieldsHeader() {
  return (
    <div className="border-b border-gray-400 p-2 w-full grid grid-cols-5 items-center">
      <div className="px-2">
        <FieldTitle name="Display name" />
      </div>

      <div className="border-l border-gray-200 px-2">
        <FieldTitle name="HubSpot source fields" />
      </div>

      <div className="border-l border-gray-200 px-2">
        <FieldTitle name="Matching method" />
      </div>

      <div className="border-l border-gray-200 px-2">
        <FieldTitle
          name="If match?"
          tooltip="When two items matches on this field, are they duplicates?"
        />
      </div>

      <div className="border-l border-gray-200 px-2">
        <FieldTitle
          name="If different?"
          tooltip="When two items have non-matching value on this field, what happens?"
        />
      </div>
    </div>
  );
}

function FieldEditor({
  config,
  field,
  onChange,
  onDelete,
}: {
  config: ItemConfig;
  field: ItemFieldConfigT;
  onChange: (newField: ItemFieldConfigT) => void;
  onDelete: () => void;
}) {
  const handleChange = (newPartialField: Partial<ItemFieldConfigT>) => {
    const newField = mergeDeep(field, newPartialField) as ItemFieldConfigT;

    onChange(newField);
  };

  return (
    <div className="flex flex-row border-b border-gray-400 p-2 gap-2 items-center">
      <div className="  w-full grid grid-cols-5 items-center gap-2">
        <Input
          className={cn(" font-semibold", {
            "border-red-500": !field.displayName,
            "[&:not(:hover)]:border-transparent": field.displayName,
          })}
          value={field.displayName}
          onChange={(e) => handleChange({ displayName: e.target.value })}
          placeholder="Display name"
        />

        <MultiSelect
          options={config.hubspotSourceFields}
          selected={field.sources}
          className={cn({
            "border-red-500": !field.sources.length,
          })}
          onChange={(v) => handleChange({ sources: v })}
        />

        <Select
          onValueChange={(v) =>
            handleChange({
              matchingMethod: v as ItemFieldConfigT["matchingMethod"],
            })
          }
          value={field.matchingMethod}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="exact">Exact</SelectItem>
            <SelectItem value="similar">Similar</SelectItem>
            <SelectItem value="name">Special: Name matching</SelectItem>
            <SelectItem value="email">Special: Email matching</SelectItem>
            <SelectItem value="url">Special: URL matching</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) =>
            handleChange({
              ifMatch: v as ItemFieldConfigT["ifMatch"],
            })
          }
          value={field.ifMatch}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="confident">
              Confident and double potential
            </SelectItem>
            <SelectItem value="potential">Potential</SelectItem>
            <SelectItem value="multiplier">Multiplier</SelectItem>
            <SelectItem value="null">Do nothing</SelectItem>
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) =>
            handleChange({
              ifDifferent: v as ItemFieldConfigT["ifDifferent"],
            })
          }
          defaultValue={field.ifDifferent}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="prevent-match">
              Prevent them from matching
            </SelectItem>
            <SelectItem value="prevent-confident-reduce-potential">
              Prevent confident match and reduce double potential
            </SelectItem>
            <SelectItem value="reduce-confident-reduce-potential">
              Reduce confident and potential
            </SelectItem>
            <SelectItem value="prevent-confident">Prevent confident</SelectItem>
            <SelectItem value="reduce-confident">Reduce confident</SelectItem>
            <SelectItem value="reduce-potential">Reduce potential</SelectItem>
            <SelectItem value="null">Do nothing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-6">
        <SpIconButton icon={Icons.x} variant="ghost" onClick={onDelete} />
      </div>
    </div>
  );
}
