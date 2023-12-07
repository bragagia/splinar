"use client";

import {
  DupStackCardRow,
  DupStackRowInfos,
} from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpButton, SpIconButton } from "@/components/sp-button";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DupStackItemBase,
  DupStackType,
  getDupstackConfidentsAndReference,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import {
  SupabaseClient,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { MergeDeep } from "type-fest";

export type DupItemTypeType = "REFERENCE" | "CONFIDENT" | "POTENTIAL";

export function DupStackCard<
  ItemT extends DupStackItemBase,
  DupstackT extends MergeDeep<
    DupStackType,
    {
      dup_stack_items: ItemT[];
    }
  >
>({
  dupStack,
  itemMerge,
  getCardTitle,
  sortItems,
  getDupstackItemId,
  saveNewItemDupType,
  getRowInfos,
  itemWordName,
}: {
  dupStack: DupstackT;
  itemMerge: (workspaceId: string, dupStack: DupstackT) => Promise<void>;
  getCardTitle: (items: ItemT[]) => string;
  sortItems: (items: ItemT[]) => ItemT[];
  getDupstackItemId: (item: ItemT) => string;
  saveNewItemDupType: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    dupstackId: string,
    itemId: string,
    newDupType: DupItemTypeType
  ) => void;
  getRowInfos(workspaceHubId: string, item: ItemT): DupStackRowInfos;
  itemWordName: string;
}) {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [cachedDupStack, setCachedDupStack] = useState<DupstackT>(dupStack);
  const [merged, setMerged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => setCachedDupStack(dupStack), [dupStack]);

  const onUpdateDupType = (id: string) => (newDupType: DupItemTypeType) => {
    setCachedDupStack({
      ...cachedDupStack,
      dup_stack_items: cachedDupStack.dup_stack_items.map((dupStackItem) => {
        if (getDupstackItemId(dupStackItem) !== id) {
          if (
            newDupType === "REFERENCE" &&
            dupStackItem.dup_type === "REFERENCE"
          ) {
            saveNewItemDupType(
              supabase,
              workspace.id,
              dupStackItem.dupstack_id,
              getDupstackItemId(dupStackItem),
              "CONFIDENT"
            );

            return {
              ...dupStackItem,
              dup_type: "CONFIDENT",
            };
          } else {
            return dupStackItem;
          }
        } else {
          saveNewItemDupType(
            supabase,
            workspace.id,
            dupStackItem.dupstack_id,
            getDupstackItemId(dupStackItem),
            newDupType
          );

          return {
            ...dupStackItem,
            dup_type: newDupType,
          };
        }
      }),
    });
  };

  const onMerge = async () => {
    setLoading(true);
    await itemMerge(workspace.id, cachedDupStack);
    setLoading(false);
    setMerged(true);
  };

  let cardTitle = getCardTitle(
    getDupstackConfidentsAndReference(cachedDupStack)
  );

  const reference = getDupstackReference(cachedDupStack);
  const confidentsAndReference =
    getDupstackConfidentsAndReference(cachedDupStack);
  const potentials = getDupstackPotentials(cachedDupStack);

  const isExpandable =
    getRowInfos(workspace.hub_id, reference).columns.length > 4;

  return (
    <Card className="grow shadow-lg group/card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex flex-row items-center gap-2 justify-between w-full">
          <div>
            {cardTitle}

            {loading && (
              <span className="flex flex-row items-center gap-1 text-gray-500">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                <span className="text-xs font-light">merging</span>
              </span>
            )}

            {merged && (
              <span className="flex flex-row items-center gap-1 text-gray-500">
                <Icons.check className="h-4 w-4" />
                <span className="text-xs font-light">merged</span>

                <div className="flex ml-1">
                  <a
                    href={getRowInfos(workspace.hub_id, reference).hubspotLink}
                    target="_blank"
                    className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#fff1e8] px-1 py-1 gap-1"
                  >
                    <span className="flex w-3 h-3 items-center justify-center">
                      <Icons.hubspot />
                    </span>
                  </a>
                </div>
              </span>
            )}
          </div>

          {isExpandable && (
            <SpIconButton
              variant={allExpanded ? "ghostActivated" : "ghost"}
              className={
                !allExpanded ? "invisible group-hover/card:visible" : ""
              }
              icon={Icons.maximize}
              onClick={() => setAllExpanded(!allExpanded)}
            />
          )}
        </CardTitle>
      </CardHeader>

      {!loading && !merged && (
        <>
          <CardContent>
            <div className="flex flex-col">
              {sortItems(confidentsAndReference).map((dupStackItem, i) => (
                <div key={i}>
                  {i !== 0 && (
                    <div
                      className={cn(
                        "w-full",
                        { "border-b border-gray-100": !allExpanded },
                        { "border-b-2 border-gray-300": allExpanded }
                      )}
                    ></div>
                  )}

                  <DupStackCardRow
                    rowInfos={getRowInfos(workspace.hub_id, dupStackItem)}
                    isReference={dupStackItem.dup_type === "REFERENCE"}
                    onUpdateDupType={onUpdateDupType(
                      getDupstackItemId(dupStackItem)
                    )}
                    expand={allExpanded}
                  />
                </div>
              ))}

              <SpButton
                variant="outline"
                icon={Icons.merge}
                onClick={onMerge}
                disabled={
                  !confidentsAndReference || confidentsAndReference.length <= 1
                }
                className="mt-2"
              >
                Merge {confidentsAndReference.length} {itemWordName}
              </SpButton>
            </div>
          </CardContent>

          {potentials && potentials.length > 0 && (
            <CardGrayedContent>
              <div className="flex flex-col pt-2">
                <p className="text-xs text-gray-600 py-1">
                  Potentials matches:
                </p>

                {sortItems(potentials).map((dupStackItem, i) => (
                  <div key={i}>
                    {i !== 0 && (
                      <div
                        className={cn(
                          "w-full border-b",
                          { "border-b border-gray-200": !allExpanded },
                          { "border-b-2 border-gray-300": allExpanded }
                        )}
                      ></div>
                    )}

                    <DupStackCardRow
                      rowInfos={getRowInfos(workspace.hub_id, dupStackItem)}
                      isPotential
                      onUpdateDupType={onUpdateDupType(
                        getDupstackItemId(dupStackItem)
                      )}
                      expand={allExpanded}
                    />
                  </div>
                ))}
              </div>
            </CardGrayedContent>
          )}
        </>
      )}
    </Card>
  );
}
