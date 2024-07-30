"use client";

import {
  disableDataCleaningJob,
  enableOrUpdateDataCleaningJob,
  execJobOnAllItemsSA,
} from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/serverEnableOrUpdateJob";
import {
  JobExecutionOutputWithInput,
  customJobExecutorSA,
} from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/serverJob";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  SpButton,
  SpConfirmButton,
  SpIconButton,
} from "@/components/sp-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardGrayedContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useDebounce from "@/lib/debounce";
import {
  OperationWorkspaceJobExecOnAllMetadata,
  WorkspaceOperationT,
  workspaceOperationGetLastOf,
} from "@/lib/operations";
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { Tables, TablesUpdate } from "@/types/supabase";
import Editor, { useMonaco } from "@monaco-editor/react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ItemTypeT,
  getItemTypeConfig,
  getItemTypesList,
  itemFieldValuesAreEqual,
} from "../../../../../../lib/items_common";

const typeDef = `type HubSpotItem = {
  id: string;
  itemType: "CONTACTS" | "COMPANIES" | "DEALS";
  fields: {
    [key: string]: string | null;
  };
};

declare function stringSimScore(string1: string, string2: string): number;`;

type JobRecurrenceType =
  | "each-new"
  | "each-new-and-updated"
  | "every-day"
  | "every-week"
  | "every-month";

export default function DataCleaningJobPage({
  params,
}: {
  params: { jobId: string };
}) {
  const router = useRouter();

  const workspace = useWorkspace();
  const supabase = newSupabaseBrowserClient();

  const monaco = useMonaco();

  const [job, setJob] = useState<Tables<"data_cleaning_jobs"> | undefined>();
  const [jobValidated, setJobValidated] = useState<
    Tables<"data_cleaning_job_validated"> | undefined
  >();

  const debouncedJob = useDebounce(job, 400);
  const [jobIsPersisted, setJobIsPersisted] = useState<boolean | undefined>();

  const [jobLogsCount, setJobLogsCount] = useState<number | null>(null);

  const [sampleItems, setSampleItems] = useState<Tables<"items">[]>([]);
  const [sampleOutput, setSampleOutput] =
    useState<JobExecutionOutputWithInput>();

  const [jobOperation, setJobOperation] = useState<
    WorkspaceOperationT<OperationWorkspaceJobExecOnAllMetadata> | undefined
  >();

  const fetchJobOperation = useCallback(() => {
    workspaceOperationGetLastOf<OperationWorkspaceJobExecOnAllMetadata>(
      supabase,
      workspace.id,
      {
        opeType: "JOB_EXEC_ON_ALL",
        linkedObject: params.jobId,
      }
    ).then((operation) => {
      setJobOperation(operation || undefined);
    });

    // We update job log count here so that it's updated at the same time as any pending operation
    supabase
      .from("data_cleaning_job_logs")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspace.id)
      .eq("data_cleaning_job_id", params.jobId)
      .is("accepted_at", null)
      .is("discarded_at", null)
      .limit(0)
      .then(({ count, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobLogsCount(count);
      });
  }, [supabase, workspace.id, params.jobId]);

  useEffect(() => {
    if (
      !jobOperation ||
      jobOperation.ope_status === "ERROR" ||
      jobOperation.ope_status === "DONE"
    ) {
      // We don't need to update an operation that is in error/done
      return;
    }

    const interval = setInterval(
      () => fetchJobOperation(),
      process.env.NODE_ENV === "development" ? 500 : 5000
    );

    return () => {
      clearInterval(interval);
    };
  }, [jobOperation, fetchJobOperation]);

  const jobIsUpToDate = useMemo(() => {
    if (!job || !jobValidated) {
      return false;
    }

    return (
      job.code === jobValidated.code &&
      job.mode === jobValidated.mode &&
      job.recurrence === jobValidated.recurrence &&
      job.target_item_type === jobValidated.target_item_type
    );
  }, [job, jobValidated]);

  useEffect(() => {
    supabase
      .from("data_cleaning_jobs")
      .select("*, data_cleaning_job_validated(*)")
      .is("deleted_at", null)
      .is("data_cleaning_job_validated.deleted_at", null)
      .eq("workspace_id", workspace.id)
      .eq("id", params.jobId)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobValidated(data.data_cleaning_job_validated[0] || undefined);
        const tmp: any = data;
        delete tmp.data_cleaning_job_validated;
        setJob(tmp);
      });

    fetchJobOperation();
  }, [supabase, workspace.id, params.jobId, fetchJobOperation]);

  useEffect(() => {
    if (!debouncedJob) {
      return;
    }

    supabase
      .from("data_cleaning_jobs")
      .update(debouncedJob)
      .eq("id", params.jobId)
      .then(({ error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobIsPersisted(true);
      });
  }, [supabase, params.jobId, debouncedJob]);

  const updateJob = async (updatedJob: TablesUpdate<"data_cleaning_jobs">) => {
    setJob((prev) => {
      if (prev) {
        return {
          ...prev,
          ...updatedJob,
        };
      }
    });

    setJobIsPersisted(false);
  };

  const deleteJob = async () => {
    await supabase
      .from("data_cleaning_jobs")
      .update({ deleted_at: dayjs().toISOString() })
      .eq("id", params.jobId);
    router.push(URLS.workspace(workspace.id).dataCleaning);
  };

  useEffect(() => {
    if (!job?.code) {
      return;
    }

    customJobExecutorSA(sampleItems, job.code).then((output) => {
      setSampleOutput(output);
    });
  }, [sampleItems, job?.code]);

  useEffect(() => {
    if (!job) {
      return;
    }

    supabase
      .from("items")
      .select("*")
      .eq("item_type", job.target_item_type)
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .is("merged_in_distant_id", null)
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        setSampleItems(data || []);
      });
  }, [supabase, workspace.id, job]);

  useEffect(() => {
    if (!monaco) return;

    monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDef);
  }, [monaco]);

  const enableOrUpdateJob = async () => {
    if (!job) {
      return;
    }

    setJobValidated(await enableOrUpdateDataCleaningJob(job.id));
  };

  const disableJob = async () => {
    if (!job) {
      return;
    }

    await disableDataCleaningJob(job.id);
    setJobValidated(undefined);
  };

  const resetJobToLiveVersion = async () => {
    if (!job || !jobValidated) {
      return;
    }

    updateJob({
      code: jobValidated.code,
      mode: jobValidated.mode,
      recurrence: jobValidated.recurrence,
      target_item_type: jobValidated.target_item_type,
    });
    setJobIsPersisted(true);
  };

  const execJobOnAllItems = async () => {
    const operation = await execJobOnAllItemsSA(params.jobId);
    setJobOperation(operation);
  };

  if (!job) {
    return <>loading</>;
  }

  let currentOperationProgress: number | undefined;
  if (
    jobOperation &&
    (jobOperation.ope_status === "QUEUED" ||
      jobOperation.ope_status === "PENDING")
  ) {
    if (jobOperation.metadata?.progress) {
      const progress = jobOperation.metadata.progress;
      currentOperationProgress = Math.ceil(
        (progress.done / (progress.total || 1)) * 100
      );
    } else {
      currentOperationProgress = 0;
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={URLS.workspace(workspace.id).dataCleaning}
                >
                  Data cleaning
                </BreadcrumbLink>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <BreadcrumbPage>{job.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-row gap-3">
          {!(jobValidated && jobIsUpToDate) &&
            jobIsPersisted !== undefined &&
            (jobIsPersisted ? (
              <div className="font-medium text-gray-400 flex flex-row items-center gap-1 text-xs">
                <Icons.check className="h-3 w-3" /> Draft saved
              </div>
            ) : (
              <div className="font-medium text-gray-300 flex flex-row items-center gap-1 text-xs">
                <Icons.spinner className="h-3 w-3 animate-spin" /> Saving
              </div>
            ))}

          {jobValidated ? (
            <div className="flex flex-row gap-2">
              {jobIsUpToDate ? (
                <SpButton
                  variant="outline"
                  colorClass="green"
                  icon={Icons.check}
                  disabled
                  size="md"
                >
                  Up to date
                </SpButton>
              ) : (
                <SpButton
                  variant="full"
                  onClick={async () => {
                    await enableOrUpdateJob();
                  }}
                  className="animate-pulse hover:animate-none"
                >
                  Update live version
                </SpButton>
              )}
            </div>
          ) : (
            <SpConfirmButton
              variant="full"
              onClick={async () => {
                await enableOrUpdateJob();
              }}
              confirmDescription={`This will enable the job on all future ${
                getItemTypeConfig(workspace, job.target_item_type).word
              } changes. You will be able to review the changes before they are applied.`}
            >
              Enable
            </SpConfirmButton>
          )}

          <SpConfirmButton
            variant="full"
            disabled={currentOperationProgress !== undefined}
            onClick={execJobOnAllItems}
            confirmDescription={`This will start the execution of this job on all ${
              getItemTypeConfig(workspace, job.target_item_type).word
            } items. You will be able to review the changes before they are applied.`}
          >
            Execute job on all{" "}
            {getItemTypeConfig(workspace, job.target_item_type).word}
            {currentOperationProgress !== undefined &&
              ` (${currentOperationProgress}%)`}
          </SpConfirmButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SpIconButton variant="outline" icon={Icons.dotsVertical} />
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <button
                  className="w-full disabled:pointer-events-none disabled:text-gray-300"
                  disabled={!jobValidated}
                  onClick={disableJob}
                >
                  Pause job
                </button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <button
                  className="w-full disabled:pointer-events-none disabled:text-gray-300"
                  disabled={!jobValidated}
                  onClick={resetJobToLiveVersion}
                >
                  Reset job to live version
                </button>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <SpConfirmButton classic className="w-full" onClick={deleteJob}>
                  Delete job
                </SpConfirmButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {jobLogsCount ? (
        <SpButton
          variant="full"
          colorClass={jobLogsCount ? "orange" : "black"}
          onClick={() => {
            router.push(
              URLS.workspace(workspace.id).dataCleaningReview(job.id)
            );
          }}
        >
          <div className="m-4 flex flex-row justify-between w-full items-center">
            <span className="font-medium">
              {`There is ${jobLogsCount} item changes from this job to review`}
            </span>

            <Icons.arrowRight className="w-4 h-4" />
          </div>
        </SpButton>
      ) : (
        <></>
      )}

      <div className="flex flex-col space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center gap-2">
                <Label className="w-28">Title:</Label>
                <Input
                  type="text"
                  value={job.title}
                  onChange={(e) => {
                    updateJob({
                      title: e.target.value,
                    });
                  }}
                  className="w-96 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-row items-center gap-2">
                <Label className="w-28">Targets:</Label>

                <div className="w-96">
                  <Select
                    onValueChange={(value: ItemTypeT) => {
                      updateJob({
                        target_item_type: value,
                      });
                    }}
                    value={job.target_item_type}
                  >
                    <SelectTrigger className="w-96">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getItemTypesList().map((itemType, i) => (
                        <SelectItem key={i} value={itemType}>
                          {getItemTypeConfig(workspace, itemType).word}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-row items-center gap-2">
                <Label className="w-28">Recurrence:</Label>

                <div>
                  <Select
                    onValueChange={(value: JobRecurrenceType) => {
                      updateJob({
                        recurrence: value,
                      });
                    }}
                    value={job.recurrence}
                  >
                    <SelectTrigger className="w-96">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="each-new">
                        On each created item
                      </SelectItem>
                      <SelectItem value="each-new-and-updated">
                        On each created or updated item
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="my-2 w-full bg-blue-100 rounded-md p-4 text-sm text-gray-900 flex flex-row items-center gap-4">
                <Icons.infos className="w-6 h-6 text-blue-500" />

                <div className="flex flex-col space-y-2">
                  <p>
                    In a job, you can write code in typescript/javascript to
                    change the values of each item the way you want.
                  </p>

                  <p>
                    Documentation is available{" "}
                    <a href="#" className="text-blue-600 underline">
                      here
                    </a>
                    .
                  </p>

                  <p>
                    Please note we do <b>not</b> offer assistance about how to
                    code / use javascript, only on specific questions about the
                    API.
                  </p>
                </div>
              </div>

              <div className="rounded-md bg-[#1e1e1e] p-2">
                <Editor
                  height="500px"
                  language="typescript"
                  theme="vs-dark"
                  className="rounded-md"
                  value={job.code}
                  onChange={(newCode) => {
                    if (newCode) {
                      updateJob({
                        code: newCode,
                      });
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                  }}
                />
              </div>
            </div>
          </CardContent>

          <CardGrayedContent>
            <h3 className="text-md font-semibold mb-2">Output preview</h3>

            <Table>
              <TableHeader>
                <TableRow>
                  {sampleOutput?.fieldsName.map((fieldName, i) => (
                    <TableHead key={i}>{fieldName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {sampleOutput &&
                  Object.keys(sampleOutput.outputFieldsByItemId).map(
                    (itemId, i) => {
                      const fields = sampleOutput.outputFieldsByItemId[itemId];

                      return (
                        <TableRow key={i}>
                          {sampleOutput?.fieldsName.map((fieldName, i) => {
                            const inputValue =
                              sampleOutput.inputFieldsByItemId[itemId][
                                fieldName
                              ];

                            const outputValue = fields[fieldName];

                            return (
                              <TableCell key={i}>
                                <div className="flex flex-row gap-1 items-center">
                                  <div className="flex flex-col space-y-2">
                                    {inputValue === null ||
                                    inputValue == undefined ? (
                                      "-"
                                    ) : (
                                      <div>
                                        {inputValue || (
                                          <span className="text-gray-300">
                                            empty string
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {!itemFieldValuesAreEqual(
                                    inputValue,
                                    outputValue
                                  ) && (
                                    <>
                                      <Icons.arrowRight className="h-3 w-3" />

                                      <div className="flex flex-col font-bold bg-green-100 p-1 rounded-md border border-green-500 space-y-2">
                                        {outputValue === null ||
                                        outputValue == undefined ? (
                                          "-"
                                        ) : (
                                          <div>
                                            {outputValue && outputValue !== ""
                                              ? outputValue
                                              : "-"}
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    }
                  )}
              </TableBody>
            </Table>
          </CardGrayedContent>
        </Card>
      </div>
    </div>
  );
}
