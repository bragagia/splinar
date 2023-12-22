"use server";

import { newHubspotClient } from "@/lib/hubspot";
import { InsertMergedCompaniesType } from "@/types/companies";
import {
  DupStackWithCompaniesType,
  getDupstackConfidents,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/dupstacks";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import { Client } from "@hubspot/api-client";
import { captureException } from "@sentry/node";
import {
  SupabaseClient,
  createServerActionClient,
} from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function companiesMergeSA(
  workspaceId: string,
  dupStack: DupStackWithCompaniesType,
  hsClient?: Client
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  let { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (workspaceError) {
    throw workspaceError;
  }
  if (!workspace) {
    throw new Error("Missing workspace");
  }

  let { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (!sessionData.session) {
    throw new Error("Missing user session");
  }

  if (!hsClient) {
    hsClient = await newHubspotClient(workspace.refresh_token);
  }

  await companiesMerge(supabase, workspace, dupStack, hsClient);
}

export async function companiesMerge(
  supabase: SupabaseClient<Database>,
  workspace: WorkspaceType,
  dupStack: DupStackWithCompaniesType,
  hsClient: Client
) {
  const referenceItem = getDupstackReference(dupStack);
  const itemsToMerge = getDupstackConfidents(dupStack);
  const itemIdsToMarkFalsePositive = getDupstackPotentials(dupStack); // TODO:

  if (!referenceItem) {
    throw new Error("Missing reference item");
  }
  if (!referenceItem || !itemsToMerge || itemsToMerge.length === 0) {
    return;
    // TODO: Handle the case where no contacts to merge, but some contacts to mark as false positive
  }

  // TODO: We should catch if there is an error, and still save the merged contacts
  await Promise.all(
    itemsToMerge.map(async (itemToMerge) => {
      // SPECIFIC v
      await hsClient?.crm.companies.publicObjectApi.merge({
        primaryObjectId: referenceItem.company?.hs_id.toString() || "",
        objectIdToMerge: itemToMerge.company?.hs_id.toString() || "",
      });
    })
  );

  // SPECIFIC v
  const mergedCompanies: InsertMergedCompaniesType[] = itemsToMerge.map(
    (itemToMerge) => ({
      workspace_id: workspace.id,
      hs_id: itemToMerge.company?.hs_id || 0,
      merged_in_hs_id: referenceItem.company?.hs_id || 0,

      name: itemToMerge.company?.name,
      address: itemToMerge.company?.address,
      zip: itemToMerge.company?.zip,
      city: itemToMerge.company?.city,
      state: itemToMerge.company?.state,
      country: itemToMerge.company?.country,
      domain: itemToMerge.company?.domain,
      website: itemToMerge.company?.website,
      owner_hs_id: itemToMerge.company?.owner_hs_id,
      phone: itemToMerge.company?.phone,
      facebook_company_page: itemToMerge.company?.facebook_company_page,
      linkedin_company_page: itemToMerge.company?.linkedin_company_page,
      twitterhandle: itemToMerge.company?.twitterhandle,
    })
  );
  const { error } = await supabase
    .from("merged_companies")
    .insert(mergedCompanies);
  if (error) {
    captureException(error);
  }

  // TODO!!! : contact_companies should be merged too before deleting the merged companies

  if (itemIdsToMarkFalsePositive && itemIdsToMarkFalsePositive.length > 0) {
    const { error: errorUpdateDupStack } = await supabase
      .from("dup_stack_companies")
      .delete()
      .eq("dupstack_id", dupStack.id)
      .in(
        "company_id",
        itemsToMerge.map((dupStackItem) => dupStackItem.company_id)
      )
      .eq("workspace_id", workspace.id);

    if (errorUpdateDupStack) {
      captureException(errorUpdateDupStack);
    }
  } else {
    const { error: errorDeleteDupstack } = await supabase
      .from("dup_stacks")
      .delete()
      .eq("id", dupStack.id)
      .eq("workspace_id", workspace.id);

    if (errorDeleteDupstack) {
      captureException(errorDeleteDupstack);
    }
  }

  const { error: errorDeleteCompanies } = await supabase
    .from("companies")
    .delete()
    .in(
      "id",
      itemsToMerge.map((dupStackCompany) => dupStackCompany.company_id)
    )
    .eq("workspace_id", workspace.id);

  if (errorDeleteCompanies) {
    captureException(errorDeleteCompanies);
  }
}
