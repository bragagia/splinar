"use client";

import {
  disableDataCleaningJob,
  enableOrUpdateDataCleaningJob,
} from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/serverEnableOrUpdateJob";
import { customJobExecutorSA } from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/serverJob";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  SpButton,
  SpConfirmButton,
  SpIconButton,
} from "@/components/sp-button";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multiselect";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useDebounce from "@/lib/debounce";
import { captureException } from "@/lib/sentry";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { Tables, TablesUpdate } from "@/types/supabase";
import Editor, { useMonaco } from "@monaco-editor/react";
import Document from "@tiptap/extension-document";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import Link from "next/link";
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
      job.target_item_types.length === jobValidated.target_item_types.length &&
      job.target_item_types.every(function (value, index) {
        return value === jobValidated.target_item_types[index];
      })
    );
  }, [job, jobValidated]);

  const titleEditor = useEditor(
    {
      extensions: [
        Document,
        Paragraph,
        Text,
        History,
        Extension.create({
          addKeyboardShortcuts(this) {
            return {
              Enter: () => {
                updateJob({
                  title: this.editor.getText(),
                });
                this.editor.commands.blur();
                return true;
              },
            };
          },
        }),
      ],
      autofocus: false,
      content: "",
      onBlur({ editor, event }) {
        updateJob({
          title: editor.getText(),
        });
      },
    },
    [params.jobId]
  );

  useEffect(() => {
    supabase
      .from("data_cleaning_jobs")
      .select("*, data_cleaning_job_validated(*)")
      .eq("workspace_id", workspace.id)
      .eq("id", params.jobId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          captureException(error);
          return;
        }

        setJobValidated(data?.data_cleaning_job_validated || undefined);
        const tmp: any = data;
        delete tmp.data_cleaning_job_validated;
        setJob(tmp);
      });
  }, [supabase, workspace.id, params.jobId]);

  useEffect(() => {
    if (titleEditor && job) {
      titleEditor.commands.setContent(job.title);
    }
  }, [titleEditor, job]);

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
    await supabase.from("data_cleaning_jobs").delete().eq("id", params.jobId);
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
    if (!job?.target_item_types) {
      return;
    }

    supabase
      .from("items")
      .select("*")
      .in("item_type", job?.target_item_types)
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
  }, [supabase, workspace.id, job?.target_item_types]);

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

  if (!job) {
    return <>loading</>;
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data cleaning</h2>

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
              {jobValidated && (
                <DropdownMenuItem asChild>
                  <button
                    className="w-full"
                    onClick={async () => {
                      await disableJob();
                    }}
                  >
                    Pause job
                  </button>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <SpConfirmButton
                  classic
                  className="w-full"
                  onClick={async () => {
                    await deleteJob();
                  }}
                >
                  Delete job
                </SpConfirmButton>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-row justify-between items-center">
              <CardTitle className="tracking-tight">
                <Link href={URLS.workspace(workspace.id).dataCleaning}>
                  <Icons.chevronLeft className="h-6 w-6 inline mb-1 text-gray-400 font-light" />
                  My jobs
                </Link>

                <span className="text-gray-400 font-light mx-2">/</span>

                {titleEditor ? (
                  <div className="py-1 px-2 rounded-lg border border-transparent hover:border-gray-700 hover:border-opacity-20 focus-within:border-gray-700 focus-within:border-opacity-50 focus:bg-white hover:bg-white focus-within:bg-white hover:focus-within:border-opacity-50 hover:focus-within:border-gray-700 inline-block">
                    <EditorContent
                      className="inline-block"
                      editor={titleEditor}
                    />
                  </div>
                ) : (
                  <p>{job.title}</p>
                )}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col space-y-2">
              <div className="flex flex-row items-center gap-2">
                <Label className="w-28">Targets:</Label>

                <div className="w-96">
                  <MultiSelect
                    options={[
                      { label: "Contacts", value: "CONTACTS" },
                      { label: "Companies", value: "COMPANIES" },
                    ]}
                    selected={job.target_item_types}
                    onChange={(newTarget) => {
                      updateJob({
                        target_item_types: newTarget as ItemTypeT[],
                      });
                    }}
                  />
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
                      <SelectItem value="each-new">On each new item</SelectItem>
                      <SelectItem value="each-new-and-updated">
                        On each new/updated item
                      </SelectItem>
                      <SelectItem value="every-day">Every day</SelectItem>
                      <SelectItem value="every-week">Every week</SelectItem>
                      <SelectItem value="every-month">Every month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs
                value={job.mode}
                onValueChange={(newMode) => {
                  updateJob({
                    mode: newMode as jobModeT,
                  });
                }}
              >
                <div className="flex flex-row items-center">
                  <Label className="mr-2 w-28">Mode:</Label>

                  <div>
                    <TabsList>
                      <TabsTrigger value="standard">Standard</TabsTrigger>
                      <TabsTrigger value="expert">Expert</TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <TabsContent value="standard">
                  <div className="flex flex-col space-y-4">
                    <div>
                      <Label>Filter:</Label>

                      <p className="ml-4 text-sm text-gray-500">
                        None, all items will be transformed
                      </p>
                    </div>

                    <div>
                      <Label>Transform:</Label>

                      <div className="ml-4 bg-gray-100 p-2 border border-gray-400 rounded-md">
                        <div className="flex flex-row items-center gap-2">
                          <Label className="shrink-0">Input field:</Label>

                          <MultiSelect
                            options={hubspotSourceFields}
                            selected={["firstname"]}
                            onChange={() => {}}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Action:</Label>

                      <p className="ml-4 text-sm text-gray-500">None</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="expert">
                  <div className="my-2 w-full bg-blue-100 rounded-md p-4 text-sm text-gray-900 flex flex-row items-center gap-4">
                    <Icons.infos className="w-6 h-6 text-blue-500" />

                    <div className="flex flex-col space-y-2">
                      <p>
                        In expert mode, you can write code in
                        typescript/javascript to change the values of each item
                        the way you want.
                      </p>

                      <p>
                        Documentation is available{" "}
                        <a href="#" className="text-blue-600 underline">
                          here
                        </a>
                        .
                      </p>

                      <p>
                        Please note we do <b>not</b> offer assistance about how
                        to code / use javascript, only on specific questions
                        about the API.
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
                </TabsContent>
              </Tabs>
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

type JobExecutionOutput = {
  fieldsName: string[];
  fieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  };
};

export type JobExecutionOutputWithInput = {
  fieldsName: string[];
  outputFieldsByItemId: {
    [key: string]: {
      [key: string]: string | null | undefined;
    };
  };
  inputFieldsByItemId: {
    [key: string]: {
      [key: string]: string | null | undefined;
    };
  };
};

// async function customJobExecutor(
//   items: Tables<"items">[],
//   code: string
// ): Promise<JobExecutionOutputWithInput> {
//   let outputFieldsNames: string[] = [];
//   let outputFieldsByItemId: {
//     [key: string]: {
//       [key: string]: string[] | null | undefined;
//     };
//   } = {};
//   let inputFieldsByItemId: {
//     [key: string]: {
//       [key: string]: string[] | null | undefined;
//     };
//   } = {};

//   try {
//     //globalThis.stringSimScore = stringSimilarity.compareTwoStrings;
//     const job = new Function("item", makeCodeAFunctionBody(code));

//     items.forEach((item) => {
//       if (!item.value) {
//         return;
//       }

//       let itemFields: {
//         [key: string]: string[] | null | undefined;
//       } = {};
//       Object.keys(item.value).forEach((fieldName) => {
//         itemFields[fieldName] = getItemValueAsArray(
//           item.value,
//           [fieldName],
//           "string"
//         );
//       });

//       const itemOutput = job({
//         id: item.id,
//         itemType: item.item_type,
//         fields: JSON.parse(JSON.stringify(itemFields)),
//       });

//       const thisOutputFieldsNames = Object.keys(itemOutput.fields);
//       thisOutputFieldsNames.forEach((fieldName) => {
//         if (outputFieldsNames.indexOf(fieldName) === -1) {
//           if (
//             !itemFieldValuesAreEqual(
//               itemFields[fieldName],
//               itemOutput.fields[fieldName]
//             )
//           ) {
//             outputFieldsNames.push(fieldName);
//           }
//         }
//       });

//       outputFieldsByItemId[item.id] = itemOutput.fields;
//       inputFieldsByItemId[item.id] = itemFields;
//     });
//   } catch (e) {
//     return {
//       fieldsName: ["error"],
//       outputFieldsByItemId: {
//         "1": {
//           error: "Your code seems invalid. Please check it and try again.",
//         },
//       },
//       inputFieldsByItemId: {
//         "1": {
//           error: "",
//         },
//       },
//     };
//   }

//   return {
//     fieldsName: outputFieldsNames,
//     outputFieldsByItemId: outputFieldsByItemId,
//     inputFieldsByItemId: inputFieldsByItemId,
//   };
// }

function makeCodeAFunctionBody(code: string) {
  const codeByLines = code.split("\n");

  delete codeByLines[0];
  delete codeByLines[codeByLines.length - 1];

  return codeByLines.join("\n");
}

type Item = {
  id: string;
  itemType: "CONTACTS" | "COMPANIES";
  fields: {
    [key: string]: string[] | undefined;
  };
};

type JobOutput = {
  updatedFields: {
    [key: string]: string[] | null | undefined;
  };
  report: {
    [key: string]: string[] | null | undefined;
  };
};

function customJob(item: Item): JobOutput {
  const output: JobOutput = {
    updatedFields: {},
    report: {},
  };

  const fields = ["firstname", "lastname"];

  fields.forEach((fieldName) => {
    output.updatedFields[fieldName] = item.fields[fieldName]?.map((value) => {
      return value
        .trim() // Remove leading and trailing spaces
        .replace(/[ \t]+/g, " ") // Replace multiple spaces with a single space
        .split(" ") // Split the string into words
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ) // Capitalize each word
        .join(" "); // Join the words back together
    });
  });

  return output;
}

function customJobLinkedin(item: Item): Item {
  if (item.itemType !== "COMPANIES") {
    return item;
  }

  // Regular expression to match LinkedIn URLs
  const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com/;

  // If the linkedin_company_page field is not present, create it
  item.fields.linkedin_company_page ??= [];

  item.fields.website?.filter((value) => {
    if (linkedinRegex.test(value)) {
      // Add LinkedIn URL to 'linkedin_company_page' field
      item.fields.linkedin_company_page?.push(value);

      // By returning false in the filter, we remove the LinkedIn URL from the original field
      return false;
    } else {
      return true;
    }
  });

  return item;
}

function customJobLinkedin2(item: Item): Item {
  if (item.itemType !== "COMPANIES") {
    return item;
  }

  // Regular expression to match LinkedIn URLs
  const linkedinRegex = /^(https?:\/\/)?(www\.)?linkedin\.com/;

  // If the linkedin_company_page field is not present, create it
  item.fields.linkedin_company_page ??= [];

  const fieldsName = ["domain", "website"];
  fieldsName.forEach((fieldName) => {
    item.fields[fieldName] = item.fields[fieldName]?.filter((value) => {
      if (linkedinRegex.test(value)) {
        // Add LinkedIn URL to 'linkedin_company_page' field
        item.fields.linkedin_company_page?.push(value);

        // By returning false in the filter, we remove the LinkedIn URL from the original field
        return false;
      } else {
        return true;
      }
    });
  });

  return item;
}
