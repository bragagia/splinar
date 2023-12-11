"use client";

import { workspaceReset } from "@/app/serverActions/workspace-reset";
import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function WorkspaceSettingsPage() {
  const supabase = createClientComponentClient<Database>();
  const workspace = useWorkspace();
  const router = useRouter();
  const user = useUser();

  const [resetWorkspaceLoading, setResetWorkspaceLoading] = useState(false);

  async function onResetWorkspace(
    reset: "dup_stacks" | "full" | "similarities_and_dup"
  ) {
    setResetWorkspaceLoading(true);

    await workspaceReset(workspace.id, reset);

    router.push(URLS.workspace(workspace.id).dashboard);
  }

  async function onDeleteWorkspace() {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    router.push(URLS.workspaceIndex);
  }

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Workspace settings
        </h2>
      </div>

      {(user.role === "SUPERADMIN" ||
        process.env.NODE_ENV === "development") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Superadmin zone</CardTitle>
            <CardDescription>You got the power</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="performance" className="flex flex-col space-y-1">
                <span>Reset dup stacks</span>

                <span className="font-normal leading-snug text-muted-foreground">
                  Any information stored like &quot;Not a duplicate&quot; flags
                  will be lost /!\
                </span>
              </Label>

              <Button
                onClick={() => onResetWorkspace("dup_stacks")}
                className="bg-red-600 shrink-0"
                disabled={resetWorkspaceLoading}
              >
                {resetWorkspaceLoading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  "Reset dup stacks"
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="performance" className="flex flex-col space-y-1">
                <span>Reset similarities and dup stacks</span>
              </Label>

              <Button
                onClick={() => onResetWorkspace("similarities_and_dup")}
                className="bg-red-600 shrink-0"
                disabled={resetWorkspaceLoading}
              >
                {resetWorkspaceLoading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  "Reset similarities"
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="performance" className="flex flex-col space-y-1">
                <span>Reset workspace data</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Note: Merged data stats will be kept{" "}
                </span>
              </Label>

              <Button
                onClick={() => onResetWorkspace("full")}
                className="bg-red-600 shrink-0"
                disabled={resetWorkspaceLoading}
              >
                {resetWorkspaceLoading ? (
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                  "Reset all workspace datas"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Dangerous zone</CardTitle>
          <CardDescription>Here there is no going back</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span>Delete workspace</span>

              <span className="font-normal leading-snug text-muted-foreground">
                Delete the workspace and all its associated datas. Any billing
                will be stopped.
              </span>
            </Label>

            <Button onClick={onDeleteWorkspace} className="bg-red-600 shrink-0">
              Delete workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
