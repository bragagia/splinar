import { getWorkspaceCurrentSubscription } from "@/app/workspace/[workspaceId]/billing/subscription-helpers";
import { EmailVerificationWarning } from "@/app/workspace/[workspaceId]/emailVerificationWarning";
import { MainNav } from "@/app/workspace/[workspaceId]/main-nav";
import { UserProvider } from "@/app/workspace/[workspaceId]/user-context";
import { UserNav } from "@/app/workspace/[workspaceId]/user-nav";
import { WorkspaceProvider } from "@/app/workspace/[workspaceId]/workspace-context";
import {
  WorkspaceInstallationCard,
  WorkspaceInstallationWall,
} from "@/app/workspace/[workspaceId]/workspace-installation-wall";
import WorkspaceSwitcher from "@/app/workspace/[workspaceId]/workspace-switcher";
import { SpAnimatedButton } from "@/components/sp-button";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { URLS } from "@/lib/urls";
import { Tables } from "@/types/supabase";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: { workspaceId: string };
  children: ReactNode;
}) {
  const { workspaceId } = params;

  const supabase = newSupabaseServerClient();

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select();
  if (error) {
    throw error;
  }
  if (!workspaces) {
    throw new Error("Missing workspace");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw userError || new Error("Missing user");
  }

  const { data: userRole, error: userRoleError } = await supabase
    .from("user_roles")
    .select()
    .eq("user_id", userData.user.id)
    .limit(1);
  if (userRoleError) {
    throw userRoleError;
  }

  let workspace = workspaces.find((w) => w.id == workspaceId);

  if (!workspace) {
    redirect(URLS.workspaceIndex);
  }

  const workspaceSubscription = await getWorkspaceCurrentSubscription(
    supabase,
    workspace.id
  );

  let isFreeTier = false;
  if (!workspaceSubscription) {
    isFreeTier = true;
  }

  const shouldDisplayFreeUsageWarning =
    (isFreeTier &&
      workspace.items_count_on_install &&
      workspace.items_count_on_install > 10000) ||
    true;
  const freeUsagePercentage =
    shouldDisplayFreeUsageWarning && workspace.items_count_on_install
      ? Math.round((10000 / workspace.items_count_on_install) * 100)
      : 0;

  return (
    <UserProvider
      value={{
        id: userData.user.id,
        email: userData.user.email || "",
        role: userRole.length > 0 ? userRole[0].role : null,
      }}
    >
      <WorkspaceProvider value={workspace as Tables<"workspaces">}>
        <EmailVerificationWarning user={userData.user} />

        <WorkspaceInstallationWall>
          <div className="flex-col flex">
            <div className="border-b">
              <div className="page-container">
                <div className="flex h-16 items-center px-4">
                  <WorkspaceSwitcher />
                  <MainNav className="mx-6" />
                  <div className="ml-auto flex items-center space-x-4">
                    <UserNav />
                  </div>
                </div>
              </div>
            </div>

            <div className="page-container w-full">
              <div className="flex flex-col gap-4">
                {shouldDisplayFreeUsageWarning && (
                  <div className="flex flex-col items-center gap-4 bg-yellow-50 border-2 rounded-lg mx-4 mt-4 border-yellow-300 p-4">
                    <p>
                      <strong>Free tier alert</strong>
                    </p>

                    <p>
                      Only 10,000 items (representing {freeUsagePercentage}% of
                      your workspace) are eligible for duplicate detection under
                      our free tier.
                    </p>

                    <div className="flex flex-row items-center gap-4">
                      <Link href={URLS.workspace(workspace.id).billing.index}>
                        <SpAnimatedButton
                          size="lg"
                          id="checkout-and-portal-button"
                        >
                          Check our plans here
                        </SpAnimatedButton>
                      </Link>

                      <span className="text-sm">or</span>

                      <Link
                        href="https://calendly.com/d/3tr-btj-j8d/splinar-demo"
                        className="text-blue-800 underline"
                      >
                        Request a call
                      </Link>
                    </div>
                  </div>
                )}

                <WorkspaceInstallationCard inApp={true} />
              </div>
            </div>

            <div>
              <div className="page-container px-4 py-6">{children}</div>
            </div>
          </div>
        </WorkspaceInstallationWall>
      </WorkspaceProvider>
    </UserProvider>
  );
}
