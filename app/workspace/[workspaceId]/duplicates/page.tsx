"use client";

import { companiesMerge } from "@/app/serverActions/companies-merge";
import { companiesMergeAll } from "@/app/serverActions/companies-merge-all";
import { contactMerge } from "@/app/serverActions/contacts-merge";
import { contactMergeAll } from "@/app/serverActions/contacts-merge-all";
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
import { SpButton } from "@/components/sp-button";
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
  const [mergingAllContacts, setMergingAllContacts] = useState(false);
  const [mergingAllCompanies, setMergingAllCompanies] = useState(false);

  useEffect(() => {
    supabase
      .from("dup_stack_contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .then(({ count: contactCount, error: contactError }) => {
        if (contactError) {
          throw contactError;
        }

        setContactCount(contactCount);
      });

    supabase
      .from("dup_stack_companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .then(({ count: companiesCount, error: companiesError }) => {
        if (companiesError) {
          throw companiesError;
        }

        setCompaniesCount(companiesCount);
      });
  }, [supabase, workspace.id]);

  async function onMergeAllContacts() {
    setMergingAllContacts(true);
    await contactMergeAll(workspace.id);
    setMergingAllContacts(false);
  }

  async function onMergeAllCompanies() {
    setMergingAllCompanies(true);
    await companiesMergeAll(workspace.id);
    setMergingAllCompanies(false);
  }

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Duplicates</h2>
      </div>

      <Tabs defaultValue="companies">
        <div className="flex flex-row justify-between items-center gap-2">
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

          <div>
            <TabsContent value="companies" className="m-0">
              <SpButton
                variant="outline"
                icon={Icons.merge}
                onClick={onMergeAllCompanies}
                disabled={contactCount === 0 || mergingAllCompanies}
              >
                Merge all confident companies duplicates
              </SpButton>
            </TabsContent>

            <TabsContent value="contacts" className="m-0">
              <SpButton
                variant="outline"
                icon={Icons.merge}
                onClick={onMergeAllContacts}
                disabled={contactCount === 0 || mergingAllContacts}
              >
                Merge all confident contacts duplicates
              </SpButton>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="companies">
          {mergingAllCompanies ? (
            <div className="w-full flex flex-row items-center justify-center h-52 gap-2">
              <Icons.spinner className="h-6 w-6 animate-spin" />

              <p className="text-md font-medium text-gray-600">
                {"Merging all confident duplicates"}
              </p>
            </div>
          ) : (
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
                  getDupstackItemId={(
                    item: DupStackCompanyItemWithCompanyType
                  ) => item.company_id}
                  saveNewItemDupType={saveNewCompanyDupType}
                  getRowInfos={getCompanyRowInfos}
                />
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="contacts">
          {mergingAllContacts ? (
            <div className="w-full flex flex-row items-center justify-center h-52 gap-2">
              <Icons.spinner className="h-6 w-6 animate-spin" />

              <p className="text-md font-medium text-gray-600">
                {"Merging all confident duplicates"}
              </p>
            </div>
          ) : (
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
          )}
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
