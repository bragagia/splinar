"use client";

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

  const [refetchLoading, setRefetchLoading] = useState(false);

  function testAction() {
    fetch(URLS.workspace(workspace.id).api.testAction, {
      method: "POST",
    });
  }

  async function onRefetch() {
    setRefetchLoading(true);

    await fetch(URLS.workspace(workspace.id).api.reset, {
      method: "POST",
    });

    setRefetchLoading(false);
  }

  async function onDeleteWorkspace() {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    router.push(URLS.workspaceIndex);
  }

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dangerous zone</CardTitle>
          <CardDescription>Here there is no going back</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span>Test action</span>
              <span className="font-normal leading-snug text-muted-foreground">
                DO NOT USE
              </span>
            </Label>
            <Button onClick={testAction} className="shrink-0">
              Start
            </Button>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span>Recheck all duplicates</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Re-analyse duplicates from scratch. You <b>don&apos;t</b> risk
                any data loss with this.
              </span>
            </Label>
            <Button className="shrink-0" disabled>
              Recheck
            </Button>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span>Re-fetch workspace data</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Erase all workspace data and fetch everything from Hubspot,
                starting from scratch.{" "}
                <b>
                  Any information stored like &quot;Not a duplicate&quot; flags
                  will be lost.
                </b>
              </span>
            </Label>
            <Button
              onClick={onRefetch}
              className="bg-red-500 shrink-0"
              disabled={refetchLoading}
            >
              {refetchLoading ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                "Reset workspace"
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span>Delete workspace</span>
              <span className="font-normal leading-snug text-muted-foreground">
                Delete the workspace and all its associated datas. Any billing
                will be stopped.
              </span>
            </Label>
            <Button onClick={onDeleteWorkspace} className="bg-red-500 shrink-0">
              Delete workspace
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
