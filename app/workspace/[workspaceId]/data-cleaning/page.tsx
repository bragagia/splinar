"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpButton } from "@/components/sp-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { URLS } from "@/lib/urls";
import { useRouter } from "next/navigation";

export default function DataCleaningPage() {
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data cleaning</h2>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My jobs</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col space-y-4">
            <div className="flex flex-col space-y-2">
              <DataCleaningJob
                title="Standardize full names"
                entities={["Contacts"]}
                recurrence="Every day"
                isEnabled
              />
            </div>

            <SpButton
              variant="outline"
              onClick={() => {
                console.log("Create new job");
              }}
              icon={Icons.add}
            >
              Create custom job
            </SpButton>
          </CardContent>

          <CardGrayedContent>
            <h3 className="text-md font-semibold mb-2">Templates</h3>

            <div className="flex flex-col space-y-2">
              <DataCleaningJob
                title="Standardize full names"
                entities={["Contacts"]}
                isTemplate
              />
              <DataCleaningJob
                title="Standardize phone numbers"
                entities={["Companies", "Contacts"]}
                isTemplate
              />
              <DataCleaningJob
                title="Cleanup social page misplaced in website"
                entities={["Companies"]}
                isTemplate
              />
              <DataCleaningJob
                title="Remove email adresses dynamic part"
                entities={["Contacts"]}
                isTemplate
              />
              <DataCleaningJob
                title="Remove obviously wrong data"
                entities={["All"]}
                isTemplate
              />
            </div>
          </CardGrayedContent>
        </Card>
      </div>
    </div>
  );
}

function DataCleaningJob({
  title,
  entities,
  recurrence,
  isTemplate,
  isEnabled,
}: {
  title: string;
  entities: string[];
  recurrence?: string;
  isTemplate?: boolean;
  isEnabled?: boolean;
}) {
  const workspace = useWorkspace();
  const router = useRouter();

  return (
    <SpButton
      variant={isTemplate ? "ghost" : "outline"}
      className="group/job-button px-3 py-2"
      onClick={() =>
        router.push(URLS.workspace(workspace.id).dataCleaningJob("TODO"))
      }
    >
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-row items-baseline gap-2">
          {recurrence && (
            <span className=" inline-flex gap-1 items-center">
              {recurrence} <Icons.arrowRight className="w-3 h-3" />
            </span>
          )}

          <span className="text-sm">{title}</span>

          {entities.map((entity, i) => (
            <Badge variant="outline" key={i}>
              {entity}
            </Badge>
          ))}
        </div>

        <div className="flex flex-row items-center gap-2">
          {!isTemplate && (
            <>
              {isEnabled ? (
                <span className="text-xs font-semibold text-gray-800">
                  Enabled
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-400">
                  Disabled
                </span>
              )}
            </>
          )}

          {isTemplate ? (
            <span className="opacity-50 group-hover/job-button:opacity-100">
              <Icons.add className="w-4 h-4 text-gray-600" />
            </span>
          ) : (
            <span className="hidden group-hover/job-button:block">
              <Icons.arrowRight className="w-4 h-4 text-gray-600" />
            </span>
          )}
        </div>
      </div>
    </SpButton>
  );
}
