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
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { URLS } from "@/lib/urls";
import { Tables } from "@/types/supabase";
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
              <div className="flex flex-col">
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
