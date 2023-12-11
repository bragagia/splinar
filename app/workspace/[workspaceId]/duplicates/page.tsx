"use client";

import { companiesMerge } from "@/app/serverActions/companies-merge";
import { contactMerge } from "@/app/serverActions/contacts-merge";
import {
  getCompanyCardTitle,
  getCompanyRowInfos,
  nextCompaniesPage,
  saveNewCompanyDupType,
  sortCompaniesItems,
} from "@/app/workspace/[workspaceId]/duplicates/companies";
import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import {
  getContactCardTitle,
  getContactRowInfos,
  nextContactsPage,
  saveNewContactDupType,
  sortContactsItems,
} from "@/app/workspace/[workspaceId]/duplicates/contacts";
import { DupStackCard } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DupStackCompanyItemWithCompanyType,
  DupStackContactItemWithContactAndCompaniesType,
  DupStackWithCompaniesType,
  DupStackWithContactsAndCompaniesType,
} from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import {
  SupabaseClient,
  createClientComponentClient,
} from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";

export const dynamic = "force-dynamic";

export default function DuplicatesPage() {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [contactCount, setContactCount] = useState<number | null>();
  const [companiesCount, setCompaniesCount] = useState<number | null>();

  useEffect(() => {
    supabase
      .from("dup_stacks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("item_type", "CONTACTS")
      .then(({ count: contactCount, error: contactError }) => {
        if (contactError) {
          throw contactError;
        }

        setContactCount(contactCount);
      });

    supabase
      .from("dup_stacks")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("item_type", "COMPANIES")
      .then(({ count: companiesCount, error: companiesError }) => {
        if (companiesError) {
          throw companiesError;
        }

        setCompaniesCount(companiesCount);
      });
  }, [supabase, workspace.id]);

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Duplicates</h2>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">
            <span>
              Companies
              <span className="font-light"> ({companiesCount})</span>
            </span>
          </TabsTrigger>

          <TabsTrigger value="contacts">
            <span>
              Contacts
              <span className="font-light"> ({contactCount})</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <DuplicatesInfiniteList
            list={[] as DupStackWithCompaniesType[]}
            fetchNextPage={nextCompaniesPage}
            dupStackDisplay={({
              dupStack,
            }: {
              dupStack: DupStackWithCompaniesType;
            }) => (
              <DupStackCard
                itemWordName={"companies"}
                dupStack={dupStack}
                itemMerge={companiesMerge}
                getCardTitle={getCompanyCardTitle}
                sortItems={sortCompaniesItems}
                getDupstackItemId={(item: DupStackCompanyItemWithCompanyType) =>
                  item.company_id
                }
                saveNewItemDupType={saveNewCompanyDupType}
                getRowInfos={getCompanyRowInfos}
              />
            )}
          />
        </TabsContent>

        <TabsContent value="contacts">
          <DuplicatesInfiniteList
            list={[] as DupStackWithContactsAndCompaniesType[]}
            fetchNextPage={nextContactsPage}
            dupStackDisplay={({
              dupStack,
            }: {
              dupStack: DupStackWithContactsAndCompaniesType;
            }) => (
              <DupStackCard
                itemWordName={"contacts"}
                dupStack={dupStack}
                itemMerge={contactMerge}
                getCardTitle={getContactCardTitle}
                sortItems={sortContactsItems}
                getDupstackItemId={(
                  item: DupStackContactItemWithContactAndCompaniesType
                ) => item.contact_id}
                saveNewItemDupType={saveNewContactDupType}
                getRowInfos={getContactRowInfos}
              />
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DuplicatesInfiniteList<T extends {}>({
  list,
  fetchNextPage,
  dupStackDisplay,
}: {
  list: T[] | null;
  fetchNextPage: (
    supabase: SupabaseClient<Database>,
    workspaceId: string,
    nextCursor: string | undefined
  ) => Promise<{ newDupStacks: T[]; newNextCursor: string | undefined }>;
  dupStackDisplay: ({ dupStack }: { dupStack: T }) => React.ReactNode;
}) {
  const DupStackDisplay = dupStackDisplay;

  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [dupStacks, setDupStacks] = useState<T[] | null>(list);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchNextPageWrapper = useCallback(async () => {
    if (!hasMore) {
      return;
    }

    const { newDupStacks, newNextCursor } = await fetchNextPage(
      supabase,
      workspace.id,
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
  }, [supabase, workspace.id, dupStacks, nextCursor, hasMore, fetchNextPage]);

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
