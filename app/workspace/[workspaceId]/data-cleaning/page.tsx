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
import { captureException } from "@/lib/sentry";
import { URLS } from "@/lib/urls";
import { uuid } from "@/lib/uuid";
import { DataCleaningJobWithValidated } from "@/types/data_cleaning";
import { Database, TablesInsert, TablesUpdate } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DataCleaningPage() {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();
  const [jobs, setJobs] = useState<DataCleaningJobWithValidated[]>();

  useEffect(() => {
    supabase
      .from("data_cleaning_jobs")
      .select("*, data_cleaning_job_validated(*)")
      .eq("workspace_id", workspace.id)
      .then(({ data, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobs(data);
      });
  }, [supabase, workspace.id]);

  const createJob = async () => {
    const newJob: TablesInsert<"data_cleaning_jobs"> = {
      id: uuid(),
      workspace_id: workspace.id,
      title: "New job",
      target_item_types: [],
      recurrence: "each-new-and-updated",
      mode: "standard",
      code: `function customJob(item: Item): Item {
  return item;
}`,
    };

    const { data, error } = await supabase
      .from("data_cleaning_jobs")
      .insert(newJob)
      .select()
      .single();

    if (error) {
      captureException(error);
      return;
    }

    const newCreatedJob: DataCleaningJobWithValidated = {
      ...data,
      data_cleaning_job_validated: null,
    };

    setJobs((jobs) => (jobs ? [...jobs, newCreatedJob] : [newCreatedJob]));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="absolute top-16 z-30 left-0 w-screen h-screen bg-gray-100/40 backdrop-blur-md">
        <p className="mt-40 w-full text-center text-4xl font-bold text-gray-400">
          Coming soon ⏳
        </p>
      </div>

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
              {jobs?.length === 0 && (
                <div className="text-gray-500 italic">
                  No jobs yet. Create one to start cleaning your data.
                </div>
              )}

              {jobs?.map((job, i) => (
                <DataCleaningJob key={i} job={job} />
              ))}
            </div>

            <SpButton variant="outline" onClick={createJob} icon={Icons.add}>
              Create custom job
            </SpButton>
          </CardContent>

          <CardGrayedContent>
            <h3 className="text-md font-semibold mb-2">Templates</h3>

            <div className="flex flex-col space-y-2">
              <DataCleaningJobTemplate
                job={{
                  title: "Standardize full names",
                  target_item_types: ["Contacts"],
                }}
              />
              <DataCleaningJobTemplate
                job={{
                  title: "Standardize phone numbers",
                  target_item_types: ["Companies", "Contacts"],
                }}
              />
              <DataCleaningJobTemplate
                job={{
                  title: "Cleanup social page misplaced in website",
                  target_item_types: ["Companies"],
                }}
              />
              <DataCleaningJobTemplate
                job={{
                  title: "Remove email adresses dynamic part",
                  target_item_types: ["Contacts"],
                }}
              />
              <DataCleaningJobTemplate
                job={{
                  title: "Remove obviously wrong data",
                  target_item_types: ["All"],
                }}
              />
            </div>
          </CardGrayedContent>
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
          {job.recurrence && (
            <span className=" inline-flex gap-1 items-center">
              {job.recurrence} <Icons.arrowRight className="w-3 h-3" />
            </span>
          )}

          <span className="text-sm">{job.title}</span>

          {job.target_item_types?.map((entity, i) => (
            <Badge variant="outline" key={i}>
              {entity}
            </Badge>
          ))}
        </div>

        <div className="flex flex-row items-center gap-2">
          {job.data_cleaning_job_validated ? (
            <span className="text-xs font-semibold text-gray-800">Enabled</span>
          ) : (
            <span className="text-xs font-semibold text-gray-400">
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
}: {
  job: TablesUpdate<"data_cleaning_jobs">;
}) {
  const workspace = useWorkspace();
  const router = useRouter();

  return (
    <SpButton
      variant="ghost"
      className="group/job-button px-3 py-2"
      onClick={() => {}}
    >
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-row items-baseline gap-2">
          {job.recurrence && (
            <span className=" inline-flex gap-1 items-center">
              {job.recurrence} <Icons.arrowRight className="w-3 h-3" />
            </span>
          )}

          <span className="text-sm">{job.title}</span>

          {job.target_item_types?.map((entity, i) => (
            <Badge variant="outline" key={i}>
              {entity}
            </Badge>
          ))}
        </div>

        <div className="flex flex-row items-center gap-2">
          <span className="opacity-50 group-hover/job-button:opacity-100">
            <Icons.add className="w-4 h-4 text-gray-600" />
          </span>
        </div>
      </div>
    </SpButton>
  );
}
