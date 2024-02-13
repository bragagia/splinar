"use client";

import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import { DupStackCard } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { itemsMergeAllSA } from "@/app/workspace/[workspaceId]/duplicates/items-merge-all";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpConfirmButton } from "@/components/sp-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getItemType, getItemTypesList, itemTypeT } from "@/lib/items_common";
import { DupStackWithItemsT } from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import {
  SupabaseClient,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export const dynamic = "force-dynamic";

type TypeStateT = {
  count: number | null;
  isMerging: boolean;
  word: string;
};

export default function DuplicatesPage() {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [typesList, setTypesList] = useState<itemTypeT[]>([]);
  const [typeStates, setTypeStates] = useState<{
    [key: string]: TypeStateT;
  }>();

  useEffect(() => {
    let typeStates: {
      [key: string]: TypeStateT;
    } = {};

    getItemTypesList().forEach((itemType) => {
      typeStates[itemType] = {
        count: null,
        isMerging: false,
        word: getItemType(itemType).word,
      };
    });

    setTypeStates(typeStates);
    setTypesList(Object.keys(typeStates) as itemTypeT[]);
  }, [supabase]);

  useEffect(() => {
    typesList.forEach((itemType) => {
      supabase
        .from("dup_stack_items")
        .select("*, items!inner (*)", { count: "exact", head: true })
        .eq("items.item_type", itemType)
        .eq("workspace_id", workspace.id)
        .limit(0)
        .then(({ count, error }) => {
          if (error) {
            throw error;
          }

          setTypeStates((cur) => {
            if (!cur) {
              return {};
            }

            cur[itemType].count = count;

            return { ...cur };
          });
        });
    });
  }, [supabase, typesList, workspace.id]);

  useEffect(() => {
    if (typesList.length === 0) {
      return;
    }

    if (workspace.companies_operation_status === "PENDING") {
      setTypeStates((cur) => {
        if (!cur) {
          return {};
        }

        cur.COMPANIES.isMerging = true;

        return { ...cur };
      });
    } else {
      setTypeStates((cur) => {
        if (!cur) {
          return {};
        }

        cur.COMPANIES.isMerging = false;

        return { ...cur };
      });
    }
  }, [typesList, workspace.companies_operation_status]);

  useEffect(() => {
    if (typesList.length === 0) {
      return;
    }

    if (workspace.contacts_operation_status === "PENDING") {
      setTypeStates((cur) => {
        if (!cur) {
          return {};
        }

        cur.CONTACTS.isMerging = true;

        return { ...cur };
      });
    } else {
      setTypeStates((cur) => {
        if (!cur) {
          return {};
        }

        cur.CONTACTS.isMerging = false;

        return { ...cur };
      });
    }
  }, [typesList, workspace.contacts_operation_status]);

  if (!typeStates) {
    return (
      <div className="w-full flex items-center justify-center h-52">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  async function onMergeAll(itemType: itemTypeT) {
    setTypeStates((cur) => {
      if (!cur) {
        return {};
      }

      cur[itemType].isMerging = true;

      return { ...cur };
    });

    await itemsMergeAllSA(workspace.id, itemType);
  }

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Duplicates</h2>
      </div>

      <Tabs defaultValue={Object.keys(typeStates)[0]}>
        <div className="flex flex-row justify-between items-center gap-2">
          <TabsList>
            {Object.keys(typeStates).map((typeStateKey, i) => (
              <TabsTrigger key={i} value={typeStateKey}>
                <span>
                  {typeStates[typeStateKey].word}
                  <span className="font-light">
                    {" "}
                    (
                    {typeStates[typeStateKey].count !== null ? (
                      typeStates[typeStateKey].count
                    ) : (
                      <Icons.spinner className="inline-flex h-3 w-3 animate-spin" />
                    )}
                    )
                  </span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div>
            {Object.keys(typeStates).map((typeStateKey, i) => {
              const typeState = typeStates[typeStateKey];

              return (
                <TabsContent key={i} value={typeStateKey} className="m-0">
                  <SpConfirmButton
                    variant="outline"
                    icon={Icons.merge}
                    onClick={() => onMergeAll(typeStateKey as itemTypeT)}
                    disabled={typeState.count === 0 || typeState.isMerging}
                  >
                    Merge all confident {typeState.word} duplicates
                  </SpConfirmButton>
                </TabsContent>
              );
            })}
          </div>
        </div>

        {Object.keys(typeStates).map((typeStateKey, i) => {
          const typeState = typeStates[typeStateKey];

          return (
            <TabsContent key={i} value={typeStateKey}>
              {typeState.isMerging ? (
                <div className="w-full flex flex-row items-center justify-center h-52 gap-2">
                  <Icons.spinner className="h-6 w-6 animate-spin" />

                  <p className="text-md font-medium text-gray-600">
                    {"Merging all confident duplicates"}
                  </p>
                </div>
              ) : (
                <DuplicatesInfiniteList
                  itemsType={typeStateKey as itemTypeT}
                  dupStackDisplay={({
                    dupStack,
                  }: {
                    dupStack: DupStackWithItemsT;
                  }) => (
                    <DupStackCard
                      itemWordName={typeState.word}
                      dupStack={dupStack}
                    />
                  )}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function DuplicatesInfiniteList({
  dupStackDisplay,
  itemsType,
}: {
  dupStackDisplay: ({
    dupStack,
  }: {
    dupStack: DupStackWithItemsT;
  }) => React.ReactNode;
  itemsType: itemTypeT;
}) {
  const DupStackDisplay = dupStackDisplay;

  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [dupStacks, setDupStacks] = useState<DupStackWithItemsT[] | null>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchNextPageWrapper = useCallback(async () => {
    if (!hasMore) {
      return;
    }

    const { newDupStacks, newNextCursor } = await fetchNextPage(
      supabase,
      workspace.id,
      itemsType,
      nextCursor
    );

    if (!newDupStacks || newDupStacks.length === 0) {
      setHasMore(false);
      return;
    }

    setDupStacks((dupStacks ?? []).concat(...newDupStacks));
    setNextCursor(newNextCursor);

    if (newDupStacks.length !== PAGE_SIZE) {
      setHasMore(false);
    }
  }, [supabase, workspace.id, dupStacks, nextCursor, hasMore, itemsType]);

  useEffect(() => {
    fetchNextPageWrapper().then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InfiniteScroll
      dataLength={dupStacks?.length || 0}
      next={fetchNextPageWrapper}
      hasMore={hasMore}
      style={{ overflow: "visible" }}
      loader={
        <div className="w-full flex items-center justify-center h-52">
          <Icons.spinner className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      {(!dupStacks || dupStacks.length === 0) && !hasMore ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <Image
            src="/seagull.jpeg"
            alt=""
            width={1600}
            height={1200}
            className="w-96 grayscale"
          />

          <p className="text-lg font-medium text-gray-600">
            {"Well done, it's very empty around here!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            {dupStacks?.map((dups, i) => (
              <DupStackDisplay key={i} dupStack={dups} />
            ))}
          </div>
        </div>
      )}
    </InfiniteScroll>
  );
}

async function fetchNextPage(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  itemsType: itemTypeT,
  nextCursor: string | undefined
) {
  let query = supabase
    .from("dup_stacks")
    .select("*, dup_stack_items(*, item:items(*))")
    .limit(PAGE_SIZE)
    .eq("workspace_id", workspaceId)
    .eq("item_type", itemsType)
    .order("created_at", { ascending: true });

  if (nextCursor) {
    query = query.gt("created_at", nextCursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  let newNextCursor: string | undefined = undefined;
  if (data.length > 0) {
    newNextCursor = data[data.length - 1].created_at;
  }

  return { newDupStacks: data, newNextCursor: newNextCursor };
}
