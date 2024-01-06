import { updateDupStackCompaniesInstallationDone } from "@/inngest/dedup/dup-stacks/companies";
import { updateDupStackContactsInstallationDone } from "@/inngest/dedup/dup-stacks/contacts";
import {
  updateCompaniesDupStacks,
  updateContactsDupStacks,
} from "@/inngest/dedup/dup-stacks/update";
import { Database } from "@/types/supabase";
import { SupabaseClient } from "@supabase/supabase-js";

export async function installDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  await installContactsDupStacks(supabase, workspaceId);
  await installCompaniesDupStacks(supabase, workspaceId);
}

export async function installContactsDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  return await updateContactsDupStacks(supabase, workspaceId, async () => {
    await updateDupStackContactsInstallationDone(supabase, workspaceId);
  });
}

export async function installCompaniesDupStacks(
  supabase: SupabaseClient<Database>,
  workspaceId: string
) {
  return await updateCompaniesDupStacks(supabase, workspaceId, async () => {
    await updateDupStackCompaniesInstallationDone(supabase, workspaceId);
  });
}
