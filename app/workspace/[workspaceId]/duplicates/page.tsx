"use client";

import { ContactDuplicate } from "@/app/workspace/[workspaceId]/duplicates/contact-duplicate";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DupStackWithContactsAndCompaniesType } from "@/types/database-types";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default function DuplicatesPage() {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [dupStacks, setDupStacks] = useState<
    DupStackWithContactsAndCompaniesType[] | null
  >(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(true);

  const contactCount = useMemo(async () => {
    const { count, error } = await supabase
      .from("dup_stacks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id);
    if (error) {
      throw error;
    }

    return count;
  }, [supabase, workspace.id]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore) {
      return;
    }

    let query = supabase
      .from("dup_stacks")
      .select("*, dup_stack_contacts(*, contact:contacts(*, companies(*)))")
      .limit(PAGE_SIZE)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: true });

    if (nextCursor) {
      query = query.gt("created_at", nextCursor);
    }

    const { data: newDupStacks, error: errorDupStacks } = await query;
    if (errorDupStacks) {
      throw errorDupStacks;
    }

    if (!newDupStacks || newDupStacks.length === 0) {
      setHasMore(false);
      return;
    }

    setDupStacks((dupStacks ?? []).concat(...newDupStacks));
    setNextCursor(newDupStacks[newDupStacks.length - 1].created_at);

    if (newDupStacks.length !== PAGE_SIZE) {
      setHasMore(false);
    }
  }, [supabase, workspace.id, dupStacks, nextCursor, hasMore]);

  useEffect(() => {
    fetchNextPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Duplicates</h2>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">
            <span>
              Contacts
              {dupStacks && (
                <span className="font-light"> ({contactCount})</span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <InfiniteScroll
            dataLength={dupStacks?.length || 0}
            next={fetchNextPage}
            hasMore={hasMore}
            loader={
              <div className="w-full flex items-center justify-center h-52">
                <Icons.spinner className="h-6 w-6 animate-spin" />
              </div>
            }
          >
            {(!dupStacks || dupStacks.length === 0) && !hasMore ? (
              <p>{"You've got no duplicates :)"}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-4">
                  {dupStacks?.map((dups, i) => (
                    <ContactDuplicate key={i} dupStack={dups} />
                  ))}
                </div>
              </div>
            )}
          </InfiniteScroll>
        </TabsContent>

        <TabsContent value="companies">Not implemented yet</TabsContent>
      </Tabs>
    </div>
  );
}
