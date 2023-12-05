"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function WorkspaceInstallationCard({
  className,
}: {
  className?: string;
}) {
  const workspace = useWorkspace();

  if (workspace.installation_status !== "PENDING") {
    return <></>;
  }

  let progressTotal =
    1 +
    (workspace.installation_companies_similarities_total_batches +
      workspace.installation_contacts_similarities_total_batches >
    0
      ? workspace.installation_companies_similarities_total_batches +
        workspace.installation_contacts_similarities_total_batches
      : 50) +
    (workspace.installation_dup_total > 0
      ? workspace.installation_dup_total / 30
      : 50);

  let progress = 0;
  progress += workspace.installation_fetched ? 1 : 0;
  progress +=
    workspace.installation_companies_similarities_done_batches +
    workspace.installation_contacts_similarities_done_batches;
  progress += workspace.installation_dup_done / 30;

  let percent = (100 * progress) / progressTotal;

  let explanation = "";
  if (!workspace.installation_fetched) {
    explanation = "Fetching your hubspot data";
  } else if (
    workspace.installation_contacts_similarities_done_batches === 0 ||
    workspace.installation_contacts_similarities_done_batches <
      workspace.installation_contacts_similarities_total_batches ||
    workspace.installation_companies_similarities_done_batches === 0 ||
    workspace.installation_companies_similarities_done_batches <
      workspace.installation_companies_similarities_total_batches
  ) {
    explanation = "Checking for similarities in your data";
  } else {
    explanation = "Preparing your duplicates for display";
  }

  return (
    <Card className={cn(className)}>
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
          <Progress value={Math.round(percent)} />

          <div className="flex flex-row items-center gap-2">
            <Icons.spinner className="h-4 w-4 animate-spin" />
            <p className="text-gray-500 text-xs">{explanation}</p>{" "}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-row gap-2 text-sm">
        <Icons.infos className="h-4 w-4" />

        <p>You can leave this page, the process will continue in background.</p>
      </CardFooter>
    </Card>
  );
}

export function WorkspaceInstallationWall({
  children,
}: {
  children: ReactNode;
}) {
  const workspace = useWorkspace();

  if (process.env.NODE_ENV !== "development") {
    if (workspace.installation_status === "FRESH") {
      return (
        <div>
          <p>Not installed</p>
        </div>
      );
    }

    if (
      workspace.installation_status === "PENDING" &&
      workspace.installation_dup_done === 0
    ) {
      return (
        <div className="h-screen w-screen flex justify-center items-center">
          <WorkspaceInstallationCard className="m-8 max-w-lg w-[32rem]" />
        </div>
      );
    }
  }

  return <>{children}</>;
}
