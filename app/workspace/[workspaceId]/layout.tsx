import { MainNav } from "@/app/workspace/[workspaceId]/main-nav";
import { UserProvider } from "@/app/workspace/[workspaceId]/user-context";
import { UserNav } from "@/app/workspace/[workspaceId]/user-nav";
import { WorkspaceProvider } from "@/app/workspace/[workspaceId]/workspace-context";
import {
  WorkspaceInstallationCard,
  WorkspaceInstallationWall,
} from "@/app/workspace/[workspaceId]/workspace-installation-wall";
import WorkspaceSwitcher from "@/app/workspace/[workspaceId]/workspace-switcher";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select();
  if (error) {
    throw error;
  }
  if (!workspaces) {
    throw new Error("Missing workspace");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw sessionError || new Error("Missing session");
  }

  const { data: userRole, error: userRoleError } = await supabase
    .from("user_roles")
    .select()
    .eq("user_id", sessionData.session.user.id)
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
        id: sessionData.session.user.id,
        email: sessionData.session.user.email || "",
        role: userRole.length > 0 ? userRole[0].role : null,
      }}
    >
      <WorkspaceProvider value={workspace as WorkspaceType}>
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
                <WorkspaceInstallationCard className="m-4 self-stretch bg-gray-50" />
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
