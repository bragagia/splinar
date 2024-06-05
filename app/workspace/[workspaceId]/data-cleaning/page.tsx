"use client";

import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpButton } from "@/components/sp-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DataCleaningJobTemplateT,
  dataCleaningJobRecurrenceToString,
} from "@/lib/data_cleaning_jobs";
import { ItemTypeT, getItemTypeConfig } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { DataCleaningJobWithValidated } from "@/types/data_cleaning";
import { TablesInsert } from "@/types/supabase";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const DEFAULT_CODE = `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
}`;

export default function DataCleaningPage() {
  const router = useRouter();
  const workspace = useWorkspace();
  const user = useUser();
  const supabase = newSupabaseBrowserClient();
  const [jobs, setJobs] = useState<DataCleaningJobWithValidated[]>();
  const [jobLogsCount, setJobLogsCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("data_cleaning_jobs")
      .select("*, data_cleaning_job_validated(*)")
      .eq("workspace_id", workspace.id)
      .is("deleted_at", null)
      .is("data_cleaning_job_validated.deleted_at", null)
      .then(({ data, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobs(data);
      });

    supabase
      .from("data_cleaning_job_logs")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .limit(0)
      .then(({ count, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobLogsCount(count);
      });
  }, [supabase, workspace.id]);

  const createJob = useCallback(
    async (
      newJob: TablesInsert<"data_cleaning_jobs"> = {
        workspace_id: workspace.id,
        title: "New job",
        target_item_type: "CONTACTS",
        recurrence: "each-new-and-updated",
        mode: "standard",
        code: DEFAULT_CODE,
      }
    ) => {
      console.log(newJob);

      const { data, error } = await supabase
        .from("data_cleaning_jobs")
        .insert(newJob)
        .select()
        .single();

      if (error) {
        captureException(error);
        return;
      }

      router.push(URLS.workspace(workspace.id).dataCleaningJob(data.id));
    },
    [router, supabase, workspace.id]
  );

  if (jobs === undefined) {
    return (
      <div className="w-full flex items-center justify-center h-52">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {user.role !== "SUPERADMIN" && process.env.NODE_ENV !== "development" && (
        <div className="absolute top-16 z-30 left-0 w-screen h-screen bg-gray-100/40 backdrop-blur-md">
          <p className="mt-40 w-full text-center text-4xl font-bold text-gray-400">
            Coming soon ⏳
          </p>
        </div>
      )}

      <div className="flex flex-col space-y-8">
        <SpButton
          variant="full"
          colorClass={jobLogsCount ? "orange" : "black"}
          onClick={() => {
            router.push(URLS.workspace(workspace.id).dataCleaningReview());
          }}
        >
          <div className="m-4 flex flex-row justify-between w-full items-center">
            <span className="font-medium">
              {jobLogsCount
                ? `You've got ${jobLogsCount} item changes to review`
                : "No item changes to review"}
            </span>

            <Icons.arrowRight className="w-4 h-4" />
          </div>
        </SpButton>

        <div className="flex flex-col space-y-4">
          <CardTitle>Jobs</CardTitle>

          <div className="flex flex-col space-y-2">
            {jobs?.length === 0 && (
              <div className="text-gray-500 italic">
                No jobs yet. Create one to start cleaning your data.
              </div>
            )}

            {jobs?.map((job, i) => (
              <DataCleaningJob key={i} job={job} />
            ))}

            <SpButton
              variant="outline"
              onClick={async () => await createJob()}
              icon={Icons.add}
            >
              Create custom job
            </SpButton>
          </div>
        </div>

        <Card className="bg-gray-50 p-4 mt-8">
          <div className="flex flex-col">
            <h3 className="text-xl font-semibold">Templates</h3>

            <Accordion type="single" collapsible>
              {Object.keys(jobsTemplate).map((targetItemType, i) => (
                <div key={i} className="flex flex-col pt-6">
                  <h4 className="text-md font-medium mb-1">
                    {getItemTypeConfig(targetItemType as ItemTypeT).word}
                  </h4>

                  {jobsTemplate[targetItemType as ItemTypeT].map((job, j) => (
                    <DataCleaningJobTemplate
                      key={j}
                      job={job}
                      createJob={createJob}
                    />
                  ))}
                </div>
              ))}
            </Accordion>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DataCleaningJob({ job }: { job: DataCleaningJobWithValidated }) {
  const workspace = useWorkspace();
  const router = useRouter();

  return (
    <SpButton
      variant="outline"
      className="group/job-button px-3 py-2"
      onClick={() =>
        router.push(URLS.workspace(workspace.id).dataCleaningJob(job.id))
      }
    >
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-row items-baseline gap-2">
          <span className="text-sm">{job.title}</span>

          <span className="text-gray-500 text-xs font-light">
            {dataCleaningJobRecurrenceToString(job.recurrence)}{" "}
            {getItemTypeConfig(job.target_item_type).wordSingular}
          </span>
        </div>

        <div className="flex flex-row items-center gap-2">
          {job.data_cleaning_job_validated.length > 0 ? (
            <span className="text-xs font-semibold text-gray-800">Enabled</span>
          ) : (
            <span className="text-xs font-semibold text-gray-300">
              Disabled
            </span>
          )}

          <span className="hidden group-hover/job-button:block">
            <Icons.arrowRight className="w-4 h-4 text-gray-600" />
          </span>
        </div>
      </div>
    </SpButton>
  );
}

function DataCleaningJobTemplate({
  job,
  createJob,
}: {
  job: DataCleaningJobTemplateT;
  createJob: (newJob: TablesInsert<"data_cleaning_jobs">) => Promise<void>;
}) {
  const workspace = useWorkspace();

  return (
    <AccordionItem
      className="group/job-button px-3 py-2"
      value={job.target_item_type + job.title}
    >
      <AccordionTrigger>
        <span className="text-sm font-normal">{job.title}</span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-col">
          <p className="text-gray-500 text-sm italic">{job.description}</p>

          <div className="flex flex-row justify-end">
            <SpButton
              className="mt-4"
              onClick={async () =>
                await createJob({
                  workspace_id: workspace.id,
                  title: job.title,
                  target_item_type: job.target_item_type,
                  recurrence: job.recurrence,
                  mode: job.mode,
                  code: job.code,
                })
              }
            >
              Preview and install
            </SpButton>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

const jobsTemplate: { [key: string]: DataCleaningJobTemplateT[] } = {
  COMPANIES: [
    {
      title: "Standardize phone numbers",
      description:
        "Standardize phone numbers into international format. Note that this job also helps to detect duplicates.",
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
      }`,
    },
    {
      title: "Cleanup social page misplaced in website",
      description:
        "Move social page URLs from the website field to the social media field.",
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
      }`,
    },
    {
      title: "Remove obviously wrong data",
      description:
        "Remove obviously wrong data, such as fields containing a fake phone number like 012345789, fields containing a '-' or.",
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
        return item;
      }`,
    },
  ],
  CONTACTS: [
    {
      title: "Standardize full names",
      description:
        "Standardize full names into a single field. This job also helps to detect duplicates.",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
      }`,
    },
    {
      title: "Standardize phone numbers",
      description:
        "Standardize phone numbers into international format. Note that this job also helps to detect duplicates.",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
      }`,
    },
    {
      title: "Remove email adresses dynamic part",
      description:
        "Remove the dynamic part of email addresses, such as the '+tag'",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
  return item;
      }`,
    },
    {
      title: "Remove obviously wrong data",
      description:
        "Remove obviously wrong data, such as fields containing a fake phone number like 012345789, fields containing a '-' or.",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: `function customJob(item: HubSpotItem): HubSpotItem {
        return item;
      }`,
    },
  ],
};
