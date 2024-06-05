"use client";

import { serverAcceptJobLog } from "@/app/workspace/[workspaceId]/data-cleaning/review/serverAcceptJobLog";
import { PAGE_SIZE } from "@/app/workspace/[workspaceId]/duplicates/constant";
import { HubspotLinkButton } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card-item";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { SpButton } from "@/components/sp-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { DataCleaningJobWithValidated } from "@/types/data_cleaning";
import { Tables } from "@/types/supabase";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { MergeDeep } from "type-fest";

type JobLogWithItem = MergeDeep<
  Tables<"data_cleaning_job_logs">,
  { item: Tables<"items"> | null }
>;

type JobsByIdT = { [key: string]: DataCleaningJobWithValidated };

export default function DataCleaningReviewPage() {
  const supabase = newSupabaseBrowserClient();
  const router = useRouter();

  const workspace = useWorkspace();

  const searchParams = useSearchParams();

  const jobId = searchParams.get("jobId");

  const [jobFilter, setJobFilter] = useState<string>(jobId ?? "all");

  const [jobLogs, setJobLogs] = useState<JobLogWithItem[] | null>([]);
  const [nextCursor, setNextCursor] = useState<
    { created_at: string; id: string } | undefined
  >();
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [jobsById, setJobsById] = useState<JobsByIdT>();

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

        setJobsById(
          data.reduce((acc, job) => {
            acc[job.id] = job;
            return acc;
          }, {} as { [key: string]: DataCleaningJobWithValidated })
        );
      });
  }, [supabase, workspace.id]);

  const fetchNextPageWrapper = useCallback(async () => {
    if (!hasMore) {
      return;
    }

    let req = supabase
      .from("data_cleaning_job_logs")
      .select("*, item:items(*)")
      .eq("workspace_id", workspace.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (jobFilter !== "all") {
      req = req.eq("data_cleaning_job_id", jobFilter);
    }

    if (nextCursor) {
      req = req
        .lte("created_at", nextCursor.created_at)
        .lt("id", nextCursor.id);
    }

    const { data: newLogs, error } = await req;
    if (error) {
      throw error;
    }

    if (newLogs.length === 0) {
      setHasMore(false);
      return;
    }

    setJobLogs((jobLogs ?? []).concat(newLogs));
    setNextCursor({
      created_at: newLogs[newLogs.length - 1].created_at,
      id: newLogs[newLogs.length - 1].id,
    });

    if (newLogs.length !== PAGE_SIZE) {
      setHasMore(false);
    }
  }, [supabase, workspace.id, jobLogs, nextCursor, hasMore, jobFilter]);

  useEffect(() => {
    fetchNextPageWrapper().then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFilter]);

  if (!jobsById) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={URLS.workspace(workspace.id).dataCleaning}>
                Data cleaning
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator />

            <BreadcrumbItem>
              <BreadcrumbPage>Item changes review</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex flex-row items-center justify-between mb-4 gap-2">
        <Select
          onValueChange={(value: string) => {
            setJobLogs(null);
            setNextCursor(undefined);
            setHasMore(true);

            setJobFilter(value);

            router.push(URLS.workspace(workspace.id).dataCleaningReview(value));
          }}
          value={jobFilter || "all"}
        >
          <SelectTrigger className="w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>

            {Object.values(jobsById).map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {jobFilter !== "all" && (
          <SpButton
            onClick={async () => {
              await fetchNextPageWrapper();
            }}
          >
            Accept all changes from job &quot;{jobsById[jobFilter]?.title}&quot;
          </SpButton>
        )}
      </div>

      <InfiniteScroll
        key={jobFilter}
        dataLength={jobLogs?.length || 0}
        next={fetchNextPageWrapper}
        hasMore={hasMore}
        style={{ overflow: "visible" }}
        loader={
          <div className="w-full flex items-center justify-center h-52">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        }
      >
        {(!jobLogs || jobLogs.length === 0) && !hasMore ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center">
            <Image
              src="/seagull.jpeg"
              alt=""
              width={1600}
              height={1200}
              className="w-96 grayscale"
            />

            <p className="text-lg font-medium text-gray-600">
              {"Well done, it's very empty around here!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              {jobLogs?.map((jobLog, i) => (
                <JobLogCard
                  key={i}
                  workspace={workspace}
                  jobLog={jobLog}
                  jobsById={jobsById}
                />
              ))}
            </div>
          </div>
        )}
      </InfiniteScroll>
    </div>
  );
}

function JobLogCard({
  workspace,
  jobLog,
  jobsById,
}: {
  workspace: Tables<"workspaces">;
  jobLog: JobLogWithItem;
  jobsById: JobsByIdT;
}) {
  if (!jobLog.item) {
    return;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row-reverse items-center">
          <SpButton
            onClick={async () =>
              await serverAcceptJobLog(jobLog.workspace_id, jobLog.id)
            }
          >
            Accept
          </SpButton>

          <div className="grid grid-cols-4 items-center">
            <div>{jobsById[jobLog.data_cleaning_job_id]?.title}</div>

            <div>
              <HubspotLinkButton
                href={URLS.external.hubspotContact(
                  workspace.hub_id,
                  jobLog.item.distant_id
                )}
              >
                {(jobLog.item.value as any).firstname || jobLog.item.distant_id}
              </HubspotLinkButton>
            </div>

            <div>{JSON.stringify(jobLog.prev_value)}</div>

            <div>{JSON.stringify(jobLog.new_value)}</div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
