"use server";

import { getHubspotStats } from "@/inngest/workspace-install-fetch/install";
import { newHubspotClient } from "@/lib/hubspot";
import { newSupabaseServerClient } from "@/lib/supabase/server";

export async function calcWorkspaceDistantUsageDetailedAction(
  workspaceId: string
) {
  const supabase = newSupabaseServerClient();

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
