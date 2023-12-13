import { Overview } from "@/app/workspace/[workspaceId]/dashboard/overview";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "@/types/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const revalidate = 0;

export default async function WorkspacePage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const workspaceId = params.workspaceId;

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const { count: dupStackCount, error: errorDupStack } = await supabase
    .from("dup_stacks")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (errorDupStack || dupStackCount === null) {
    throw errorDupStack || new Error("Missing dupstack count");
  }

  const { count: dupstackContactsCount, error: errorDupStackContacts } =
    await supabase
      .from("dup_stack_contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
  if (errorDupStackContacts) {
    throw errorDupStackContacts;
  }

  const { count: dupstackCompaniesCount, error: errorDupStackCompanies } =
    await supabase
      .from("dup_stack_companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
  if (errorDupStackCompanies) {
    throw errorDupStackCompanies;
  }

  const { count: mergedContactsCount, error: errorMergedContactsCount } =
    await supabase
      .from("merged_contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
  if (errorMergedContactsCount) {
    throw errorMergedContactsCount;
  }

  const { count: mergedCompaniesCount, error: errorMergedCompaniesCount } =
    await supabase
      .from("merged_companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);
  if (errorMergedCompaniesCount) {
    throw errorMergedCompaniesCount;
  }

  const { data: mergedContactsByMonths, error: errorMergedContactsByMonths } =
    await supabase.rpc("get_merged_contacts_by_months", {
      workspace_id_arg: workspaceId,
    });
  if (errorMergedContactsByMonths) {
    throw errorMergedContactsByMonths;
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unsolved duplicates
              </CardTitle>

              {dupStackCount > 0 ? (
                <Icons.duplicatePersons className="w-4 h-4" />
              ) : (
                <Icons.happyPerson className="w-4 h-4" />
              )}
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">
                {(dupstackContactsCount || 0) + (dupstackCompaniesCount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                could be merged as {dupStackCount} uniques items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Splinar helped you remove
              </CardTitle>

              <Icons.check className="w-4 h-4" />
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold">
                {(mergedContactsCount || 0) + (mergedCompaniesCount || 0)}
              </div>
              <p className="text-xs text-muted-foreground">duplicates so far</p>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Prevented duplicates
              </CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">703</div>
              <p className="text-xs text-muted-foreground">
                duplicates were prevented by Splinar web extension
              </p>
            </CardContent>
          </Card> */}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Removed duplicates per month</CardTitle>
            </CardHeader>

            <CardContent className="pl-2">
              {mergedContactsByMonths && (
                <Overview mergedContactsByMonths={mergedContactsByMonths} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
