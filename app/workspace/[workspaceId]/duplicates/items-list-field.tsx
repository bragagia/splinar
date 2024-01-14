"use client";

import { StandardLinkButton } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { Database, Tables } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
  const supabase = createClientComponentClient<Database>();
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
      <span className={cn("text-gray-400 font-light w-full max-w-full")}>
        <Icons.spinner className="inline-flex h-3 w-3 animate-spin" />
      </span>
    );
  }

  if (items.length === 0) {
    return (
      <span className={cn("text-gray-400 font-light w-full max-w-full")}>
        -
      </span>
    );
  }

  console.log(items);

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
