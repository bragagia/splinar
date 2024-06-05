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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemTypeConfig } from "@/lib/items_common";
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { DataCleaningJobWithValidated } from "@/types/data_cleaning";
import { Tables } from "@/types/supabase";
import Image from "next/image";
import Link from "next/link";
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
  const [nextCursor, setNextCursor] = useState<string | undefined>();
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
      .order("id", { ascending: false });
    if (jobFilter !== "all") {
      req = req.eq("data_cleaning_job_id", jobFilter);
    }

    if (nextCursor) {
      req = req.lt("id", nextCursor);
    }

    req = req.limit(PAGE_SIZE);

    const { data: newLogs, error } = await req;
    if (error) {
      throw error;
    }

    if (newLogs.length === 0) {
      setHasMore(false);
      return;
    }

    setJobLogs((jobLogs ?? []).concat(newLogs));
    setNextCursor(newLogs[newLogs.length - 1].id);

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
          <div className="flex flex-col">
            {jobLogs?.map((jobLog, i) => (
              <JobLogCard
                key={i}
                workspace={workspace}
                jobLog={jobLog}
                jobsById={jobsById}
              />
            ))}
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
  const [accepted, setAccepted] = useState<boolean>(false);

  if (!jobLog.item) {
    return;
  }

  return (
    <div className="w-full py-2 border-b border-gray-300">
      <div className="flex flex-row items-center">
        <div className="grid grid-cols-2 items-center w-full gap-2">
          <div className="flex flex-row items-center gap-1 text-sm">
            <div className="flex">
              <Link
                href={URLS.workspace(workspace.id).dataCleaningJob(
                  jobLog.data_cleaning_job_id
                )}
              >
                {jobsById[jobLog.data_cleaning_job_id]?.title}
              </Link>
            </div>

            <Icons.chevronRight className="w-3 h-3" />

            <div className="mt-1">
              <HubspotLinkButton
                href={getItemTypeConfig(jobLog.item_type).getHubspotURL(
                  workspace.hub_id,
                  jobLog.item.distant_id
                )}
              >
                {(jobLog.item.value as any).firstname ||
                  (jobLog.item.value as any).name ||
                  jobLog.item.distant_id}
              </HubspotLinkButton>
            </div>
          </div>

          <ValueDiff
            prev={jobLog.prev_value as ItemFieldsT}
            next={jobLog.new_value as ItemFieldsT}
          />
        </div>

        <div className="flex flex-row justify-center w-28">
          {!accepted ? (
            <SpButton
              className="w-full"
              onClick={async () => {
                await serverAcceptJobLog(jobLog.workspace_id, jobLog.id);
                setAccepted(true);
              }}
            >
              Accept
            </SpButton>
          ) : (
            <div className="flex flex-row items-center gap-1 text-gray-500">
              <Icons.check className="h-4 w-4" />
              <span className="text-xs font-light">Accepted</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type ItemFieldsT = { [key: string]: string | null | undefined };

function ValueDiff({
  className,
  prev,
  next,
}: {
  className?: string;
  prev: ItemFieldsT;
  next: ItemFieldsT;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      {Object.entries(next).map(([fieldKey, fieldNextValue], i) => {
        const fieldPrevValue = prev[fieldKey];

        return (
          <div key={i} className="flex flex-row items-center space-x-2">
            <div className="text-sm text-gray-500 font-bold">{fieldKey}:</div>

            <div className="flex flex-row gap-1 items-center text-sm">
              <div className="flex flex-col space-y-2">
                {fieldPrevValue === null || fieldPrevValue == undefined ? (
                  "-"
                ) : (
                  <div>
                    {fieldPrevValue || (
                      <span className="text-gray-300">empty string</span>
                    )}
                  </div>
                )}
              </div>

              <Icons.arrowRight className="h-3 w-3" />

              <div className="flex flex-col p-1 rounded-md">
                {fieldNextValue === null ||
                fieldNextValue === undefined ||
                fieldNextValue === "" ? (
                  <span className="text-gray-500 italic">Empty</span>
                ) : (
                  <span>{fieldNextValue}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
