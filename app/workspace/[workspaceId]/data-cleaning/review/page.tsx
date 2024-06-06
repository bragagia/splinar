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
import { useSearchParams } from "next/navigation";
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

  const workspace = useWorkspace();

  const searchParams = useSearchParams();

  const jobId = searchParams.get("jobId");
  const isJobSubpage = !!jobId;

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
        {!isJobSubpage && (
          <Select
            onValueChange={(value: string) => {
              setJobLogs(null);
              setNextCursor(undefined);
              setHasMore(true);

              setJobFilter(value);
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
        )}

        <span>{/* To always have the button on right */}</span>

        {jobFilter !== "all" && (
          <div className="flex flex-row gap-2">
            <SpButton
              onClick={async () => {
                await fetchNextPageWrapper();
              }}
            >
              Discard all changes of this job
            </SpButton>

            <SpButton
              onClick={async () => {
                await fetchNextPageWrapper();
              }}
            >
              Accept all changes of this job
            </SpButton>
          </div>
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
        <div className="grid grid-cols-5 items-center w-full gap-2">
          <div className="flex text-xs">
            <Link
              href={URLS.workspace(workspace.id).dataCleaningJob(
                jobLog.data_cleaning_job_id
              )}
            >
              {jobsById[jobLog.data_cleaning_job_id]?.title}
            </Link>
          </div>

          <div className="mt-1 text-xs">
            <HubspotLinkButton
              href={getItemTypeConfig(jobLog.item_type).getHubspotURL(
                workspace.hub_id,
                jobLog.item.distant_id
              )}
            >
              {getItemTypeConfig(jobLog.item_type).getItemDisplayString(
                jobLog.item
              )}
            </HubspotLinkButton>
          </div>

          <ValueDiff
            className="col-span-3"
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
    <div
      className={cn("grid grid-cols-5 gap-x-2 items-center text-sm", className)}
    >
      {Object.entries(next).map(([fieldKey, fieldNextValue], i) => {
        const fieldPrevValue = prev[fieldKey];

        return (
          <>
            <span className="text-gray-500 font-bold text-right">
              {fieldKey}:{" "}
            </span>

            <div className="text-right col-span-2">
              <span>
                {fieldPrevValue === null ||
                fieldPrevValue === undefined ||
                fieldPrevValue === "" ? (
                  <span className="text-gray-500 italic">
                    Empty{fieldPrevValue === "" && " string"}
                  </span>
                ) : (
                  <span>{fieldPrevValue}</span>
                )}
              </span>
            </div>

            <div className="flex flex-row gap-2 items-center col-span-2">
              <Icons.arrowRight className="h-3 w-3 shrink-0" />

              <div className="flex flex-col p-1 rounded-md">
                {fieldNextValue === null ||
                fieldNextValue === undefined ||
                fieldNextValue === "" ? (
                  <span className="text-gray-500 italic">
                    Empty{fieldNextValue === "" && " string"}
                  </span>
                ) : (
                  <span>{fieldNextValue}</span>
                )}
              </div>
            </div>
          </>
        );
      })}
    </div>
  );
}

// TODO: Display empty string as "Empty string" in the diff
