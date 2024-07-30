"use client";

import { StandardLinkButton } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Tables } from "@/types/supabase";
import { useEffect, useState } from "react";

export function ItemsListField({
  itemsDistantIds,
  nameFn,
  linkFn,
}: {
  itemsDistantIds: string[] | null;
  nameFn: (item: Tables<"items">) => string;
  linkFn: (item: Tables<"items">) => string;
}) {
  const supabase = newSupabaseBrowserClient();
  const workspace = useWorkspace();

  const [items, setItems] = useState<Tables<"items">[] | null>(null);

  useEffect(() => {
    if (!itemsDistantIds || itemsDistantIds.length === 0) {
      setItems([]);
      return;
    }

    supabase
      .from("items")
      .select("*")
      .eq("workspace_id", workspace.id)
      .is("merged_in_distant_id", null)
      .eq("item_type", "COMPANIES") // TODO: Should be generic
      .in("distant_id", itemsDistantIds)
      .then(({ data, error }) => {
        if (error) {
          console.log(error);
          return;
        }

        setItems(data || []);
      });
  }, [workspace.id, supabase, itemsDistantIds]);

  if (items === null) {
    return (
      <div>
        {itemsDistantIds?.map((itemDistantId, i) => (
          <StandardLinkButton key={i} href={"#"}>
            <span className="text-gray-400">#{itemDistantId}</span>
          </StandardLinkButton>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <span className={cn("text-gray-400 font-light w-full max-w-full")}>
        -
      </span>
    );
  }

  return (
    <div>
      {items.map((item, i) => (
        <StandardLinkButton key={i} href={linkFn(item)}>
          {nameFn(item)}
        </StandardLinkButton>
      ))}
    </div>
  );
}
