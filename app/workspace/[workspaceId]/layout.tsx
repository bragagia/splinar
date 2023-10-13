import { WorkspaceIdContextProvider } from "@/app/workspace/[workspaceId]/context";
import { MainNav } from "@/app/workspace/[workspaceId]/main-nav";
import { UserNav } from "@/app/workspace/[workspaceId]/user-nav";
import WorkspaceSwitcher from "@/app/workspace/[workspaceId]/workspace-switcher";
import { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceIdContextProvider>
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

        <div>
          <div className="page-container px-4 py-6">{children}</div>
        </div>
      </div>
    </WorkspaceIdContextProvider>
  );
}
