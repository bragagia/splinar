"use server";

import { getHubspotStats } from "@/inngest/dedup/fetch/install";
import { newHubspotClient } from "@/lib/hubspot";
import { Database } from "@/types/supabase";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function calcWorkspaceDistantUsageDetailedAction(
  workspaceId: string
) {
  const cookieStore = cookies();
  const supabase = createServerActionClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: workspace, error: errorWorkspace } = await supabase
    .from("workspaces")
    .select()
    .eq("id", workspaceId)
    .limit(1)
    .single();
  if (errorWorkspace || workspace === null) {
    throw errorWorkspace || new Error("Missing workspace");
  }

  let hsClientSearchLimited = await newHubspotClient(
    workspace.refresh_token,
    "search"
  );

  const { companiesTotal, contactsTotal } = await getHubspotStats(
    hsClientSearchLimited
  );

  const roundItemsCount = Math.ceil((companiesTotal + contactsTotal) / 1000);

  return {
    contactsTotal: contactsTotal,
    companiesTotal: companiesTotal,
    usage: roundItemsCount,
    usagePrice: roundItemsCount * 1,
    priceTotal: roundItemsCount * 1,
  };
}
