"use client";

import { DupStackCardRow } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { itemsMergeSA } from "@/app/workspace/[workspaceId]/duplicates/items-merge";
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
import { delay } from "@/lib/delay";
import {
  getItemStackMetadata,
  getItemTypeConfig,
  getRowInfos,
} from "@/lib/items_common";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import {
  DupStackItemWithItemT,
  DupStackWithItemsT,
  getDupstackConfidentsAndReference,
  getDupstackFalsePositives,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { useCallback, useEffect, useMemo, useState } from "react";

export type DupItemTypeType = DupStackItemWithItemT["dup_type"];

export function DupStackCard({
  dupStack,
  isDemo = false,
}: {
  dupStack: DupStackWithItemsT;
  isDemo?: boolean;
}) {
  const workspace = useWorkspace();
  const supabase = isDemo ? null : newSupabaseBrowserClient();

  const [cachedDupStack, setCachedDupStack] =
    useState<DupStackWithItemsT>(dupStack);
  const [merged, setMerged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allExpanded, setAllExpanded] = useState(false);
  const [falsePositivesExpanded, setFalsePositivesExpanded] = useState(false);

  const stackMetadata = useMemo(
    () => getItemStackMetadata(workspace, cachedDupStack),
    [cachedDupStack]
  );

  useEffect(() => setCachedDupStack(dupStack), [dupStack]);

  const onUpdateDupType = (id: string) => (newDupType: DupItemTypeType) => {
    setCachedDupStack({
      ...cachedDupStack,
      dup_stack_items: cachedDupStack.dup_stack_items.map((dupStackItem) => {
        if (dupStackItem.item_id !== id) {
          if (
            newDupType === "REFERENCE" &&
            dupStackItem.dup_type === "REFERENCE"
          ) {
            if (supabase) {
              supabase
                .from("dup_stack_items")
                .update({ dup_type: "CONFIDENT" })
                .eq("workspace_id", workspace.id)
                .eq("item_id", dupStackItem.item_id)
                .eq("dupstack_id", dupStackItem.dupstack_id)
                .then(({ error }) => {
                  if (error) {
                    console.log(error);
                  }
                });
            }

            return {
              ...dupStackItem,
              dup_type: "CONFIDENT",
            };
          } else {
            return dupStackItem;
          }
        } else {
          if (supabase) {
            supabase
              .from("dup_stack_items")
              .update({ dup_type: newDupType })
              .eq("workspace_id", workspace.id)
              .eq("item_id", dupStackItem.item_id)
              .eq("dupstack_id", dupStackItem.dupstack_id)
              .then(({ error }) => {
                if (error) {
                  console.log(error);
                }
              });
          }

          return {
            ...dupStackItem,
            dup_type: newDupType,
          };
        }
      }),
    });
  };

  const onMerge = useCallback(async () => {
    setLoading(true);

    if (isDemo) {
      await delay(1500);
    } else {
      await itemsMergeSA(workspace.id, cachedDupStack.id, undefined, true);
    }

    setLoading(false);
    setMerged(true);
  }, [cachedDupStack, isDemo, workspace.id]);

  const reference = useMemo(
    () => getDupstackReference(cachedDupStack),
    [cachedDupStack]
  );

  const confidentsAndReference = useMemo(
    () => getDupstackConfidentsAndReference(cachedDupStack),
    [cachedDupStack]
  );

  const potentials = useMemo(
    () => getDupstackPotentials(cachedDupStack),
    [cachedDupStack]
  );

  const falsePositives = useMemo(
    () => getDupstackFalsePositives(cachedDupStack),
    [cachedDupStack]
  );

  let cardTitle = useMemo(() => {
    return confidentsAndReference.reduce((acc, dupStackItem) => {
      const rowInfos = getRowInfos(workspace, dupStackItem, stackMetadata);
      const cardTitle = rowInfos.name;

      return cardTitle && cardTitle.length > acc.length ? cardTitle : acc;
    }, "");
  }, [workspace, confidentsAndReference, stackMetadata]);

  const isExpandable = useMemo(
    () => getRowInfos(workspace, reference, stackMetadata).columns.length > 4,
    [reference, stackMetadata, workspace]
  );

  const itemConfig = getItemTypeConfig(workspace, dupStack.item_type);

  return (
    <Card className="grow shadow-lg group/card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex flex-row justify-between w-full">
          <div className="text-lg flex flex-row items-center gap-2">
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
                    href={itemConfig.getHubspotURL(
                      workspace.hub_id,
                      reference.item?.distant_id || ""
                    )}
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

          {!merged && isExpandable && (
            <SpIconButton
              variant={allExpanded ? "ghostActivated" : "grayedGhost"}
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
              {sortDupStackItems(confidentsAndReference).map(
                (dupStackItem, i) => (
                  <div key={i}>
                    {i !== 0 && (
                      <div
                        className={cn(
                          "w-full",
                          { "border-b border-gray-100": !allExpanded },
                          { "border-b border-gray-400": allExpanded }
                        )}
                      ></div>
                    )}

                    <DupStackCardRow
                      rowInfos={getRowInfos(
                        workspace,
                        dupStackItem,
                        stackMetadata
                      )}
                      onUpdateDupType={onUpdateDupType(dupStackItem.item_id)}
                      expand={allExpanded}
                    />
                  </div>
                )
              )}

              {(!potentials || potentials.length == 0) && (
                <SpButton
                  variant="outline"
                  icon={Icons.merge}
                  onClick={onMerge}
                  disabled={
                    !confidentsAndReference ||
                    confidentsAndReference.length <= 1
                  }
                  className="mt-2"
                >
                  Merge {confidentsAndReference.length}{" "}
                  {getItemTypeConfig(workspace, dupStack.item_type).word}
                </SpButton>
              )}
            </div>
          </CardContent>

          {potentials && potentials.length > 0 && (
            <CardGrayedContent>
              <div className="flex flex-col">
                <p className="text-xs text-gray-600 py-1">
                  Potentials matches:
                </p>

                {sortDupStackItems(potentials).map((dupStackItem, i) => (
                  <div key={i}>
                    {i !== 0 && (
                      <div
                        className={cn(
                          "w-full border-b",
                          { "border-b border-gray-200": !allExpanded },
                          { "border-b border-gray-400": allExpanded }
                        )}
                      ></div>
                    )}

                    <DupStackCardRow
                      rowInfos={getRowInfos(
                        workspace,
                        dupStackItem,
                        stackMetadata
                      )}
                      onUpdateDupType={onUpdateDupType(dupStackItem.item_id)}
                      expand={allExpanded}
                    />
                  </div>
                ))}

                <SpButton
                  variant="outline"
                  icon={Icons.merge}
                  onClick={onMerge}
                  className="mt-2"
                >
                  Merge {confidentsAndReference.length + potentials.length}{" "}
                  {getItemTypeConfig(workspace, dupStack.item_type).word}
                </SpButton>
              </div>
            </CardGrayedContent>
          )}

          {falsePositives && falsePositives.length > 0 && (
            <CardGrayedContent>
              <div className="flex flex-col">
                <div className="flex flex-row items-center">
                  <SpButton
                    variant="grayedGhost"
                    className="-ml-2"
                    icon={
                      falsePositivesExpanded
                        ? Icons.chevronRight
                        : Icons.chevronDown
                    }
                    onClick={() =>
                      setFalsePositivesExpanded(!falsePositivesExpanded)
                    }
                  >
                    <p className="text-xs text-gray-600 py-1">
                      Marked false positives ({falsePositives.length})
                    </p>
                  </SpButton>
                </div>

                {falsePositivesExpanded &&
                  sortDupStackItems(falsePositives).map((dupStackItem, i) => (
                    <div key={i}>
                      {i !== 0 && (
                        <div
                          className={cn(
                            "w-full border-b",
                            { "border-b border-gray-200": !allExpanded },
                            { "border-b border-gray-400": allExpanded }
                          )}
                        ></div>
                      )}

                      <DupStackCardRow
                        rowInfos={getRowInfos(
                          workspace,
                          dupStackItem,
                          stackMetadata
                        )}
                        onUpdateDupType={onUpdateDupType(dupStackItem.item_id)}
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

function sortDupStackItems(items: DupStackItemWithItemT[]) {
  return items.sort((a, b) => {
    if (a.dup_type === "REFERENCE") return -1;
    if (b.dup_type === "REFERENCE") return 1;

    if (!a.item || !b.item) return 0;

    if (a.item?.filled_score !== b.item?.filled_score)
      return b.item.filled_score - a.item.filled_score;

    return parseInt(b.item.distant_id) - parseInt(a.item.distant_id);
  });
}
