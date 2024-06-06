"use client";

import {
  disableDataCleaningJob,
  enableOrUpdateDataCleaningJob,
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
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { Tables, TablesUpdate } from "@/types/supabase";
import Editor, { useMonaco } from "@monaco-editor/react";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ItemTypeT,
  itemFieldValuesAreEqual,
} from "../../../../../../lib/items_common";

const typeDef = `type HubSpotItem = {
  id: string;
  itemType: "CONTACTS" | "COMPANIES";
  fields: {
    [key: string]: string | null;
  };
};

declare function stringSimScore(string1: string, string2: string): number;`;

// TODO: Remove
const hubspotSourceFields = [
  {
    value: "firstname",
    label: "First name",
  },
  {
    value: "lastname",
    label: "Last name",
  },
  {
    value: "name",
    label: "Name",
  },
  {
    value: "domain",
    label: "Domain",
  },
  {
    value: "website",
    label: "Website",
  },
  {
    value: "linkedin_company_page",
    label: "LinkedIn",
  },
  {
    value: "phone",
    label: "Phone",
  },
  {
    value: "address",
    label: "Address",
  },
  {
    value: "zip",
    label: "Zip",
  },
  {
    value: "city",
    label: "City",
  },
  {
    value: "state",
    label: "State",
  },
  {
    value: "country",
    label: "Country",
  },
  {
    value: "facebook_company_page",
    label: "Facebook",
  },
  {
    value: "twitterhandle",
    label: "Twitter",
  },
];

type jobModeT = "standard" | "expert";

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

  const [sampleItems, setSampleItems] = useState<Tables<"items">[]>([]);
  const [sampleOutput, setSampleOutput] =
    useState<JobExecutionOutputWithInput>();

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
  }, [supabase, workspace.id, params.jobId]);

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

  if (!job) {
    return <>loading</>;
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
            <SpButton
              variant="full"
              onClick={async () => {
                await enableOrUpdateJob();
              }}
            >
              Enable
            </SpButton>
          )}

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
                      <SelectItem value="CONTACTS">Contacts</SelectItem>
                      <SelectItem value="COMPANIES">Companies</SelectItem>
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
