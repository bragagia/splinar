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
      .is("discarded_at", null)
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
                    {
                      getItemTypeConfig(workspace, targetItemType as ItemTypeT)
                        .word
                    }
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
            {getItemTypeConfig(workspace, job.target_item_type).wordSingular}
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
          <div className="flex flex-col gap-2 pl-2">
            {job.description.split("\n\n").map((line, i) => (
              <p className="text-gray-600 text-sm font-light" key={i}>
                {line}
              </p>
            ))}
          </div>

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

const TEMPLATE_COMPANIES_STANDARDIZE_PHONE_NUMBERS = `function customJob(item: HubSpotItem): HubSpotItem {
  // Helper function to standardize phone numbers
  function standardizePhoneNumber(field: string | null): string | null {
    if (!field) return null; // If the field is null, return null

    // Remove all spaces
    field = field.replace(/\\s+/g, '');

    // Regular expression to detect if the phone number is already in international format
    const internationalFormatRegex = /^\\+/;
    if (!internationalFormatRegex.test(field)) {
      // If not, assume it's a US number and add +1 prefix
      const usPrefix = '+1';
      field = usPrefix + field;
    }

    return field; // Return the standardized phone number
  }

  // Standardize the 'phone' field if it exists
  if (item.fields.phone) {
    item.fields.phone = standardizePhoneNumber(item.fields.phone);
  }

  return item; // Return the modified item
}`;

const TEMPLATE_COMPANIES_CLEANUP_SOCIAL_PAGE_MISPLACED_IN_WEBSITE = `function customJob(item: HubSpotItem): HubSpotItem {
  // Regular expressions for social media subpage URLs
  const regexMap = {
    linkedin_company_page: /^(https?:\\/\\/)?(www\\.)?linkedin\\.com\\/.+/,
    facebook_company_page: /^(https?:\\/\\/)?(www\\.)?facebook\\.com\\/.+/,
    twitterhandle: /^(https?:\\/\\/)?(www\\.)?twitter\\.com\\/.+/
  };

  let hasBeenSocialMediaFilled = false;

  // Helper function to move valid social media URLs to the correct field
  function moveSocialMediaURL(field: string, targetField: string, regex: RegExp) {
    if (item.fields[field] && regex.test(item.fields[field])) {
      item.fields[targetField] = item.fields[field];
      item.fields[field] = null;
      hasBeenSocialMediaFilled = true;
    }
  }

  // Process both website and domain fields for each social media type
  Object.keys(regexMap).forEach(targetField => {
    moveSocialMediaURL("website", targetField, regexMap[targetField]);
    moveSocialMediaURL("domain", targetField, regexMap[targetField]);
  });

  // Specific social media-related cleanup for non-URL based inappropriate data
  if (hasBeenSocialMediaFilled) {
    const socialMediaKeywords = ["linkedin", "facebook", "twitter"];

    ["twitterhandle", "facebook_company_page", "phone"].forEach(field => {
      if (item.fields[field]) {
        const fieldValueLower = item.fields[field].toLowerCase();
        if (socialMediaKeywords.some(keyword => fieldValueLower.includes(keyword))) {
          item.fields[field] = null;
        }
      }
    });
  }

  return item; // Return the modified item
}`;

const TEMPLATE_COMPANIES_REMOVE_OBVIOUSLY_WRONG_DATA = `function customJob(item: HubSpotItem): HubSpotItem {
// List of known fake phone numbers
const fakePhoneNumbers = ["0123456789", "1234567890", "0000000000"];
// Regular expression to identify fields containing only special characters or spaces
const invalidFieldRegex = /^[\\s\\-_\\.]*$/;
// List of default placeholder texts
const placeholderTexts = ["N/A", "Unknown", "None"];

// Helper function to check and remove invalid data
function cleanField(field: string | null): string | null {
  if (!field) return null; // If the field is null, return null
  const trimmedField = field.trim(); // Trim leading and trailing spaces

  // Check if the field matches any criteria for invalid data
  if (
    invalidFieldRegex.test(trimmedField) || // Only special characters or spaces
    placeholderTexts.includes(trimmedField) // Default placeholder text
  ) {
    return null; // Return null if invalid
  }

  return trimmedField; // Return the cleaned field if valid
}


// Helper function to clean phone number
function cleanPhoneNumber(field: string | null): string | null {
  if (!field) return null; // If the field is null, return null
  const trimmedField = field.trim(); // Trim leading and trailing spaces

  // Check if the field matches any criteria for invalid phone numbers
  if (
    fakePhoneNumbers.includes(trimmedField) || // Fake phone number
    trimmedField.length < 6 // Number shorter than 6 digits
  ) {
    return null; // Return null if invalid
  }

  return trimmedField; // Return the cleaned field if valid
}

// List of fields to be cleaned using general cleanField function
const fieldsToClean = [
  "name", "domain", "website", "linkedin_company_page",
  "address", "zip", "city",
  "state", "country", "facebook_company_page", "twitterhandle"
];

// Clean each field using the general cleanField function
fieldsToClean.forEach(field => {
  if (item.fields[field] !== undefined) {
    item.fields[field] = cleanField(item.fields[field]);
  }
});

// Clean the phone field separately using the cleanPhoneNumber function
if (item.fields["phone"] !== undefined) {
  item.fields["phone"] = cleanPhoneNumber(item.fields["phone"]);
}

return item; // Return the modified item
}`;

const TEMPLATE_CONTACTS_STANDARDIZE_PHONE_NUMBERS = `function customJob(item: HubSpotItem): HubSpotItem {
  // Helper function to standardize phone numbers
  function standardizePhoneNumber(field: string | null): string | null {
    if (!field) return null; // If the field is null, return null

    // Remove all spaces
    field = field.replace(/\\s+/g, '');

    // Regular expression to detect if the phone number is already in international format
    const internationalFormatRegex = /^\\+/;
    if (!internationalFormatRegex.test(field)) {
      // If not, assume it's a US number and add +1 prefix
      const usPrefix = '+1';
      field = usPrefix + field;
    }

    return field; // Return the standardized phone number
  }

  // Standardize the 'phone' and 'mobilephone' fields if they exist
  if (item.fields.phone) {
    item.fields.phone = standardizePhoneNumber(item.fields.phone);
  }
  if (item.fields.mobilephone) {
    item.fields.mobilephone = standardizePhoneNumber(item.fields.mobilephone);
  }

  return item; // Return the modified item
}`;

const TEMPLATE_CONTACTS_REMOVE_EMAIL_ADRESSES_DYNAMIC_PART = `function customJob(item: HubSpotItem): HubSpotItem {
  // Regular expression to match email addresses with dynamic parts (e.g., "some.body+dynamic@gmail.com")
  const dynamicEmailRegex = /^([^+]+)\\+[^@]+(@.+)$/;

  // Helper function to clean email addresses
  function cleanEmail(field: string | null): string | null {
    if (!field) return null; // If the field is null, return null
    const trimmedField = field.trim(); // Trim leading and trailing spaces

    // Check if the email has a dynamic part and remove it
    const match = dynamicEmailRegex.exec(trimmedField);
    if (match) {
      return match[1] + match[2]; // Return the email without the dynamic part
    }

    return trimmedField; // Return the cleaned field if valid
  }

  // Clean the email field if it exists
  if (item.fields["email"] !== undefined) {
    item.fields["email"] = cleanEmail(item.fields["email"]);
  }

  return item; // Return the modified item
}`;

const TEMPLATE_CONTACTS_REMOVE_OBVIOUSLY_WRONG_DATA = `function customJob(item: HubSpotItem): HubSpotItem {
  // List of known fake phone numbers
  const fakePhoneNumbers = ["0123456789", "1234567890", "0000000000"];
  // Regular expression to identify fields containing only special characters or spaces
  const invalidFieldRegex = /^[\\s\\-_\\.]*$/;
  // List of default placeholder texts
  const placeholderTexts = ["N/A", "Unknown", "None"];

  // Helper function to check and remove invalid data
  function cleanField(field: string | null): string | null {
    if (!field) return null; // If the field is null, return null
    const trimmedField = field.trim(); // Trim leading and trailing spaces

    // Check if the field matches any criteria for invalid data
    if (
      invalidFieldRegex.test(trimmedField) || // Only special characters or spaces
      placeholderTexts.includes(trimmedField) // Default placeholder text
    ) {
      return null; // Return null if invalid
    }

    return trimmedField; // Return the cleaned field if valid
  }

  // Helper function to clean phone numbers
  function cleanPhoneNumber(field: string | null): string | null {
    if (!field) return null; // If the field is null, return null
    const trimmedField = field.trim(); // Trim leading and trailing spaces

    // Check if the field matches any criteria for invalid phone numbers
    if (
      fakePhoneNumbers.includes(trimmedField) || // Fake phone number
      trimmedField.length < 6 // Number shorter than 6 digits
    ) {
      return null; // Return null if invalid
    }

    return trimmedField; // Return the cleaned field if valid
  }

  // List of fields to be cleaned using general cleanField function
  const fieldsToClean = [
    "firstname", "lastname", "email", "hs_linkedinid"
  ];

  // Clean each field using the general cleanField function
  fieldsToClean.forEach(field => {
    if (item.fields[field] !== undefined) {
      item.fields[field] = cleanField(item.fields[field]);
    }
  });

  // Clean the phone and mobilephone fields separately using the cleanPhoneNumber function
  if (item.fields["phone"] !== undefined) {
    item.fields["phone"] = cleanPhoneNumber(item.fields["phone"]);
  }
  if (item.fields["mobilephone"] !== undefined) {
    item.fields["mobilephone"] = cleanPhoneNumber(item.fields["mobilephone"]);
  }

  return item; // Return the modified item
}`;

const jobsTemplate: { [key: string]: DataCleaningJobTemplateT[] } = {
  COMPANIES: [
    {
      title: "Standardize phone numbers",
      description:
        "Standardize phone numbers into international format. Note that this job also helps to detect duplicates.",
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_COMPANIES_STANDARDIZE_PHONE_NUMBERS,
    },
    {
      title: "Cleanup social page misplaced in website",
      description: `Sometimes LinkedIn, Facebook, or Twitter URLs are incorrectly entered in the website or domain fields, and other fields like
        twitterhandle, facebook_company_page, and phone might be filled with social media data instead of the company’s actual information.

        This job moves LinkedIn, Facebook, or Twitter subpage URLs to their correct fields and clears the original website or domain fields.
        It also removes inappropriate social media-related data from other fields if they contain keywords like “linkedin,” “facebook,” or “twitter,”
        ensuring clean and accurate company records.`,
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_COMPANIES_CLEANUP_SOCIAL_PAGE_MISPLACED_IN_WEBSITE,
    },
    {
      title: "Remove obviously wrong data",
      description: `Remove obviously wrong data in all common fields like :

        1.	Fake Phone Numbers: Numbers like “0123456789”, “1234567890”, “0000000000”, etc. Numbers shorter than 6 digits.

        2.	Fields with Only Special Characters or Spaces: Fields containing “-”, “_”, “.”, or just spaces.

        3.	Default Placeholder Texts: Values like “N/A”, “Unknown”, “None”.`,
      target_item_type: "COMPANIES",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_COMPANIES_REMOVE_OBVIOUSLY_WRONG_DATA,
    },
  ],

  CONTACTS: [
    {
      title: "Standardize phone numbers",
      description:
        "Standardize phone numbers into international format. Note that this job also helps to detect duplicates.",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_CONTACTS_STANDARDIZE_PHONE_NUMBERS,
    },
    {
      title: "Remove email adresses dynamic part",
      description:
        "Remove the dynamic part of email addresses, such as the '+tag' from 'some.body+tag@gmail.com'",
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_CONTACTS_REMOVE_EMAIL_ADRESSES_DYNAMIC_PART,
    },
    {
      title: "Remove obviously wrong data",
      description: `Remove obviously wrong data in all common fields like :

        1.	Fake Phone Numbers: Numbers like “0123456789”, “1234567890”, “0000000000”, etc. Numbers shorter than 6 digits.

        2.	Fields with Only Special Characters or Spaces: Fields containing “-”, “_”, “.”, or just spaces.

        3.	Default Placeholder Texts: Values like “N/A”, “Unknown”, “None”.`,
      target_item_type: "CONTACTS",
      recurrence: "each-new-and-updated",
      mode: "expert",
      code: TEMPLATE_CONTACTS_REMOVE_OBVIOUSLY_WRONG_DATA,
    },
  ],
};
