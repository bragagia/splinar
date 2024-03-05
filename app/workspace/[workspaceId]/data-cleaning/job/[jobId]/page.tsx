"use client";

import { customJobExecutorSA } from "@/app/workspace/[workspaceId]/data-cleaning/job/[jobId]/serverJob";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { URLS } from "@/lib/urls";
import { Database, Tables } from "@/types/supabase";
import Editor, { useMonaco } from "@monaco-editor/react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getItemValueAsArray } from "../../../../../../lib/items_common";
//const ivm = require("isolated-vm");

type jobModeT = "standard" | "expert";

const code = `function customJob(item: Item): Item {
  const fields = ["firstname", "lastname"];

  fields.forEach((fieldName) => {
    item.fields[fieldName] = item.fields[fieldName]?.map((value) => {
      return value
        .trim() // Remove leading and trailing spaces
        .replace(/[ \t]+/g, " ") // Replace multiple spaces with a single space
        .split(" ") // Split the string into words
        .map(
          (word) => word.charAt(0).toLowerCase() + word.slice(1).toUpperCase()
        ) // Capitalize each word
        .join(" "); // Join the words back together
    });
  });

  return item;
}`;

const typeDef = `type Item = {
  id: string;
  itemType: "CONTACTS" | "COMPANIES";
  fields: {
    [key: string]: string[] | null;
  };
};

declare function stringSimScore(string1: string, string2: string): number;`;

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

export default function DataCleaningJobPage() {
  const workspace = useWorkspace();

  const [mode, setMode] = useState<jobModeT>("standard");
  const [standardDialogOpen, setStandardDialogOpen] = useState(false);
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [target, setTarget] = useState<string[]>(["CONTACTS"]);
  const [expertCode, setExpertCode] = useState(code);
  const monaco = useMonaco();

  const supabase = createClientComponentClient<Database>();

  const [sampleItems, setSampleItems] = useState<Tables<"items">[]>([]);

  const [sampleOutput, setSampleOutput] =
    useState<JobExecutionOutputWithInput>();

  useEffect(() => {
    customJobExecutorSA(sampleItems, expertCode).then((output) => {
      setSampleOutput(output);
    });
  }, [sampleItems, expertCode]);

  useEffect(() => {
    supabase
      .from("items")
      .select("*")
      .in("item_type", target)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return;
        }

        setSampleItems(data || []);
      });
  }, [supabase, target]);

  useEffect(() => {
    if (!monaco) return;

    monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDef);
  }, [monaco]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Data cleaning</h2>
      </div>

      <div className="flex flex-col space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="tracking-tight">
              <Link href={URLS.workspace(workspace.id).dataCleaning}>
                <Icons.chevronLeft className="h-6 w-6 inline mb-1 text-gray-400 font-light" />
                My jobs
              </Link>

              <span className="text-gray-400 font-light mx-2">/</span>

              <span>Standardize full names</span>
            </CardTitle>
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
                    selected={target}
                    onChange={setTarget}
                  />
                </div>
              </div>

              <div className="flex flex-row items-center gap-2">
                <Label className="w-28">Recurrence:</Label>

                <div>
                  <Select defaultValue="each-new-and-updated">
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
                defaultValue="standard"
                value={mode}
                onValueChange={(value) => setMode(value as jobModeT)}
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
                      value={code}
                      onChange={(value) => {
                        if (value) setExpertCode(value);
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
                            const inputValues =
                              sampleOutput.inputFieldsByItemId[itemId][
                                fieldName
                              ] || [];

                            const outputValues = fields[fieldName] || [];

                            return (
                              <TableCell key={i}>
                                <div className="flex flex-row gap-1 items-center">
                                  <div className="flex flex-col space-y-2">
                                    {inputValues.length === 0
                                      ? "-"
                                      : inputValues.map((value, i) => (
                                          <div key={i}>
                                            {value || (
                                              <span className="text-gray-300">
                                                empty string
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                  </div>

                                  {!fieldValueAreEqual(
                                    inputValues,
                                    outputValues
                                  ) && (
                                    <>
                                      <Icons.arrowRight className="h-3 w-3" />

                                      <div className="flex flex-col font-bold bg-green-100 p-1 rounded-md border border-green-500 space-y-2">
                                        {outputValues.length === 0
                                          ? "-"
                                          : outputValues.map((value, i) => (
                                              <div key={i}>
                                                {value && value !== ""
                                                  ? value
                                                  : "-"}
                                              </div>
                                            ))}
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

function fieldValueAreEqual(
  a: string[] | null | undefined,
  b: string[] | null | undefined
) {
  if (a === null || a === undefined || b === null || b === undefined) {
    if (a === b) {
      return true;
    } else {
      return false;
    }
  }

  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
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
      [key: string]: string[] | null | undefined;
    };
  };
  inputFieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  };
};

export async function customJobExecutor(
  items: Tables<"items">[],
  code: string
): Promise<JobExecutionOutputWithInput> {
  let outputFieldsNames: string[] = [];
  let outputFieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  } = {};
  let inputFieldsByItemId: {
    [key: string]: {
      [key: string]: string[] | null | undefined;
    };
  } = {};

  try {
    //globalThis.stringSimScore = stringSimilarity.compareTwoStrings;
    const job = new Function("item", makeCodeAFunctionBody(code));

    items.forEach((item) => {
      if (!item.value) {
        return;
      }

      let itemFields: {
        [key: string]: string[] | null | undefined;
      } = {};
      Object.keys(item.value).forEach((fieldName) => {
        itemFields[fieldName] = getItemValueAsArray(
          item.value,
          [fieldName],
          "string"
        );
      });

      const itemOutput = job({
        id: item.id,
        itemType: item.item_type,
        fields: JSON.parse(JSON.stringify(itemFields)),
      });

      const thisOutputFieldsNames = Object.keys(itemOutput.fields);
      thisOutputFieldsNames.forEach((fieldName) => {
        if (outputFieldsNames.indexOf(fieldName) === -1) {
          if (
            !fieldValueAreEqual(
              itemFields[fieldName],
              itemOutput.fields[fieldName]
            )
          ) {
            outputFieldsNames.push(fieldName);
          }
        }
      });

      outputFieldsByItemId[item.id] = itemOutput.fields;
      inputFieldsByItemId[item.id] = itemFields;
    });
  } catch (e) {
    return {
      fieldsName: ["error"],
      outputFieldsByItemId: {
        "1": {
          error: ["Your code seems invalid. Please check it and try again."],
        },
      },
      inputFieldsByItemId: {
        "1": {
          error: [""],
        },
      },
    };
  }

  return {
    fieldsName: outputFieldsNames,
    outputFieldsByItemId: outputFieldsByItemId,
    inputFieldsByItemId: inputFieldsByItemId,
  };
}

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
