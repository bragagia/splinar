"use client";

import { calcWorkspaceDistantUsageDetailedAction } from "@/app/workspace/[workspaceId]/billing/calc-usage-action";
import { SubscriptionOptions } from "@/app/workspace/[workspaceId]/billing/subscription-options";
import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { workspaceInstall } from "@/app/workspace/[workspaceId]/workspace-install";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

export function WorkspaceInstallationWall({
  children,
}: {
  children: ReactNode;
}) {
  const workspace = useWorkspace();
  const user = useUser();

  if (
    user.role !== "SUPERADMIN" &&
    process.env.NODE_ENV !== "development" &&
    workspace.installation_status !== "DONE" &&
    workspace.installation_dup_done === 0
  ) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <WorkspaceInstallationCard inApp={false} />
      </div>
    );
  }

  return <>{children}</>;
}

export function WorkspaceInstallationCard({ inApp }: { inApp: boolean }) {
  const workspace = useWorkspace();

  if (workspace.installation_status === "FRESH") {
    return <WorkspaceInstallationCardFresh inApp={inApp} />;
  }

  if (
    workspace.installation_status === "PENDING" ||
    workspace.installation_status === "INSTALLING"
  ) {
    return (
      <Card
        className={cn(
          inApp ? "m-4 self-stretch bg-gray-50" : "m-8 max-w-lg w-[32rem]"
        )}
      >
        <WorkspaceInstallationCardPendingInstalling />
      </Card>
    );
  }
}

export function WorkspaceInstallationCardFresh({ inApp }: { inApp: boolean }) {
  let router = useRouter();
  const workspace = useWorkspace();

  let supabase = createClientComponentClient<Database>();

  const nameRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onCancel() {
    router.push(URLS.workspaceIndex);
  }

  async function onValidate() {
    if (!nameRef.current) {
      return;
    }

    if (nameRef.current.value === "") {
      setErrorMessage("Please fill all required fields");
      return;
    }

    const { error } = await supabase
      .from("workspaces")
      .update({
        display_name: nameRef.current.value,
      })
      .eq("id", workspace.id);
    if (error) {
      setErrorMessage(
        "Something got bad, maybe you already added this workspace?"
      );
      throw error;
    }

    workspace.triggerUpdate();
  }

  const [workspaceUsage, setWorkspaceUsage] = useState<any | undefined>();

  useEffect(() => {
    calcWorkspaceDistantUsageDetailedAction(workspace.id).then(
      (workspaceUsage) => {
        setWorkspaceUsage(workspaceUsage);
      }
    );
  }, [workspace.id]);

  async function onLaunchFreeInstall() {
    await workspaceInstall(workspace.id);
    workspace.triggerUpdate();
  }

  const selectNameStep = workspace.display_name === "";

  if (selectNameStep) {
    return (
      <Card
        className={cn(
          inApp ? "m-4 self-stretch bg-gray-50" : "m-8 max-w-lg w-[32rem]"
        )}
      >
        <CardHeader>
          <CardTitle>New workspace</CardTitle>

          <CardDescription>
            Add <b>{workspace.domain}</b> to your Splinar account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                ref={nameRef}
                id="name"
                placeholder="Name of your workspace"
              />
            </div>
          </form>
          {errorMessage && (
            <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <Button onClick={onValidate}>Add workspace</Button>
        </CardFooter>
      </Card>
    );
  }

  //

  return (
    <Card
      className={cn(inApp ? "m-4 self-stretch bg-gray-50" : "m-8 w-[56rem]")}
    >
      <CardHeader>
        <CardTitle>New workspace</CardTitle>

        <CardDescription>Choose your plan</CardDescription>
      </CardHeader>

      <CardContent className="flex justify-center items-center">
        {workspaceUsage ? (
          <SubscriptionOptions
            workspaceUsage={workspaceUsage}
            currentPlan="none"
            onSelectFree={onLaunchFreeInstall}
          />
        ) : (
          <Icons.spinner className="h-4 w-4 animate-spin" />
        )}
      </CardContent>
    </Card>
  );
}

export function WorkspaceInstallationCardPendingInstalling() {
  const workspace = useWorkspace();

  useEffect(() => {
    // Force update at least every 5 seconds in case the supabase realtime hook break
    const interval = setInterval(
      () => workspace.triggerUpdate(),
      process.env.NODE_ENV === "development" ? 500 : 5000
    );

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace.id]);

  // TODO: Install.mode == "just_subscribed" -> :tada:

  // Fetch progress
  let fetchProgress = 0;

  if (workspace.installation_fetched) {
    fetchProgress = 1;
  } else {
    if (workspace.installation_items_total > 0) {
      const total = workspace.installation_items_total;

      const count = workspace.installation_items_count;

      fetchProgress = count / total;
    }
  }

  // Similarities progress
  let similaritiesProgress = 0;

  let similaritiesTotal = workspace.installation_similarities_total_batches;

  let similaritiesDone = workspace.installation_similarities_done_batches;

  if (similaritiesTotal > 0) {
    similaritiesProgress = similaritiesDone / similaritiesTotal;
  }

  // Dup stack progress
  let dupStackProgress = 0;
  if (workspace.installation_dup_total > 0) {
    dupStackProgress =
      workspace.installation_dup_done / workspace.installation_dup_total;
  }

  // Dup Stack have started and explanation

  const dupStackTextProgress =
    Math.round(dupStackProgress * 100).toString() + "%";

  // aggregate progress
  let aggregateProgress =
    (fetchProgress + similaritiesProgress + dupStackProgress) / 3;

  // Explanation
  let explanation = "(1/3) Fetching your hubspot data";

  if (fetchProgress === 1) {
    explanation = "(2/3) Checking for similarities in your data";
  }

  if (similaritiesProgress === 1) {
    explanation = `(3/3) Preparing your duplicates for display (${dupStackTextProgress})`;
  }

  // Install is pending case
  let progressStarted = true;
  if (workspace.installation_status === "PENDING") {
    explanation = "Installation will start soon";
    progressStarted = false;
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Installing workspace</CardTitle>

        <CardDescription>
          We are preparing your account, time to grab a snack 🌮
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="text-sm gap-2 flex flex-col">
          <p>This is the only time you will have to wait, we promise.</p>

          <p>
            Future changes of your data will{" "}
            <b>instantly be visible in Splinar</b> 🚀
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {progressStarted && <Progress value={aggregateProgress * 100} />}

          <div className="flex flex-row items-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
            <p className="text-gray-500 text-xs">{explanation}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-row gap-2 text-sm">
        <Icons.infos className="h-4 w-4" />

        <p>You can leave this page, the process will continue in background.</p>
      </CardFooter>
    </>
  );
}
