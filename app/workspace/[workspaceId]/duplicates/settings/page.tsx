"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpButton } from "@/components/sp-button";
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
  ItemFieldConfigT,
  getItemType,
  itemTypeT,
} from "@/lib/items_common";
import { URLS } from "@/lib/urls";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type TypeStateT = {
  word: string;
  config: DedupConfigT;
};

export default function WorkspaceSettingsPage() {
  const workspace = useWorkspace();

  const searchParams = useSearchParams();
  const itemType = searchParams.get("itemType") as itemTypeT;

  const itemTypeConfig = useMemo(() => getItemType(itemType), [itemType]);

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
          {itemTypeConfig.dedupConfig.fields.map((field, i) => (
            <FieldEditor
              key={i}
              config={itemTypeConfig.dedupConfig}
              field={field}
            />
          ))}

          <SpButton variant="full" className="mt-2 w-full" icon={Icons.add}>
            New
          </SpButton>
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
}: {
  config: DedupConfigT;
  field: ItemFieldConfigT;
}) {
  const [displayName, setDisplayName] = useState(field.displayName);
  const [sourceFields, setSourceFields] = useState<string[]>(field.sources);

  return (
    <div className="border-b border-gray-400 p-2 w-full grid grid-cols-5 items-center gap-2">
      <Input
        className="[&:not(:hover)]:border-transparent font-semibold"
        defaultValue={displayName}
      />

      <MultiSelect
        options={config.hubspotSourceFields}
        selected={sourceFields}
        onChange={setSourceFields}
      />

      {/*
      <Select onValueChange={() => {}} defaultValue={field.mergeMode}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select merge mode" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="aggregate">Aggregate</SelectItem>
          <SelectItem value="array">Array</SelectItem>
          <SelectItem value="name">Special: Name aggregate</SelectItem>
        </SelectContent>
      </Select> */}

      <Select onValueChange={() => {}} defaultValue={field.matchingMethod}>
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

      <Select onValueChange={() => {}} defaultValue={field.ifMatch}>
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

      <Select onValueChange={() => {}} defaultValue={field.ifDifferent}>
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
          <SelectItem value="reduce-confident">Reduce confident</SelectItem>
          <SelectItem value="reduce-potential">Reduce potential</SelectItem>
          <SelectItem value="null">Do nothing</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
