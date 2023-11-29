"use client";

import { contactMerge } from "@/app/serverActions/contacts_merge";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { URLS } from "@/lib/urls";
import {
  ContactWithCompaniesType,
  DupStackWithContactsAndCompaniesType,
  DupStackWithContactsType,
  getDupstackConfidentsAndReference,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/database-types";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export function ContactDuplicateRow({
  contact,
  isPotential = false,
  isReference = false,
  onUpdateDupType,
}: {
  contact: ContactWithCompaniesType;
  isPotential?: boolean;
  isReference?: boolean;
  onUpdateDupType: (
    newDupType: DupStackWithContactsType["dup_stack_contacts"][number]["dup_type"]
  ) => void;
}) {
  const workspace = useWorkspace();

  let fullname = (
    (contact.first_name || "") +
    " " +
    (contact.last_name || "")
  ).trim();

  return (
    <div className="flex flex-row rounded-md p-2 gap-3 text-sm group">
      <div className="font-medium flex items-center gap-2 basis-64">
        <div className="flex">
          <a
            href={URLS.external.hubspotContact(workspace.hub_id, contact.hs_id)}
            target="_blank"
            className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#fff1e8] px-1 py-1 gap-1"
          >
            <span className="flex w-3 h-3 items-center justify-center">
              <Icons.hubspot />
            </span>
          </a>
        </div>

        <span className="whitespace-nowrap">
          {fullname || <span className="text-gray-500 font-light">-</span>}
        </span>
      </div>

      <div className="text-gray-700 flex flex-col items-start justify-center basis-80">
        {contact.emails && contact.emails.length > 0 ? (
          contact.emails?.map((email, i) => <p key={i}>{email}</p>)
        ) : (
          <span className="text-gray-500 font-light">-</span>
        )}
      </div>

      <div className="text-gray-700 flex flex-col items-start justify-center basis-48">
        {contact.phones && contact.phones.length > 0 ? (
          contact.phones?.map((phone, i) => <p key={i}>{phone}</p>)
        ) : (
          <span className="text-gray-500 font-light">-</span>
        )}
      </div>

      <div className="text-gray-700 flex flex-col items-start justify-center basis-32">
        {contact.companies && contact.companies.length > 0 ? (
          contact.companies?.map((company, i) => <p key={i}>{company.name}</p>)
        ) : (
          <span className="text-gray-500 font-light">-</span>
        )}
      </div>

      <div className="flex flex-row justify-end items-center gap-2">
        <TooltipProvider delayDuration={400} skipDelayDuration={1}>
          {!isPotential && (
            <>
              {isReference ? (
                <>
                  <button className="invisible border px-1 py-1 ">
                    <div className="w-4 h-4" />
                  </button>

                  <Tooltip>
                    <TooltipTrigger>
                      <div className="border rounded-lg text-sm px-1 py-1 bg-white text-gray-600 border-gray-600">
                        <Icons.arrowsPointingIn className="w-4 h-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <div className="flex flex-row items-center gap-1">
                        <Icons.infos />
                        <p>
                          This is the reference contact in which all others will
                          be merged
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => onUpdateDupType("POTENTIAL")}
                        className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-400 invisible hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                      >
                        <Icons.thumbDown className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <p>Mark as false positive</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => onUpdateDupType("REFERENCE")}
                        className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-400 invisible hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                      >
                        <Icons.arrowsPointingIn className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <p>
                        Set as reference contact in which all others will be
                        merged
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </>
          )}

          {isPotential && (
            <>
              <button className="invisible border px-1 py-1 ">
                <div className="w-4 h-4" />
              </button>

              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => onUpdateDupType("CONFIDENT")}
                    className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-500  hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                  >
                    <Icons.add className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={10}>
                  <p>Add to merge list</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

export function ContactDuplicate({
  dupStack,
}: {
  dupStack: DupStackWithContactsAndCompaniesType;
}) {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [cachedDupStack, setCachedDupStack] = useState(dupStack);
  const [merged, setMerged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setCachedDupStack(dupStack), [dupStack]);

  const onUpdateDupType =
    (id: string) =>
    (
      newDupType: DupStackWithContactsType["dup_stack_contacts"][number]["dup_type"]
    ) => {
      setCachedDupStack({
        ...cachedDupStack,
        dup_stack_contacts: cachedDupStack.dup_stack_contacts.map(
          (dupStackContact) => {
            if (dupStackContact.contact_id !== id) {
              if (
                newDupType === "REFERENCE" &&
                dupStackContact.dup_type === "REFERENCE"
              ) {
                supabase
                  .from("dup_stack_contacts")
                  .update({ dup_type: "CONFIDENT" })
                  .eq("workspace_id", workspace.id)
                  .eq("contact_id", dupStackContact.contact_id)
                  .eq("dupstack_id", dupStackContact.dupstack_id)
                  .then();

                return {
                  ...dupStackContact,
                  dup_type: "CONFIDENT",
                };
              } else {
                return dupStackContact;
              }
            } else {
              supabase
                .from("dup_stack_contacts")
                .update({ dup_type: newDupType })
                .eq("workspace_id", workspace.id)
                .eq("contact_id", dupStackContact.contact_id)
                .eq("dupstack_id", dupStackContact.dupstack_id)
                .then();

              return {
                ...dupStackContact,
                dup_type: newDupType,
              };
            }
          }
        ),
      });
    };

  const onMerge = async () => {
    setLoading(true);
    await contactMerge(workspace.id, cachedDupStack);
    setLoading(false);
    setMerged(true);
  };

  let commonFullName = getDupstackConfidentsAndReference(cachedDupStack).reduce(
    (acc, dupStackContact) => {
      let fullname = (
        (dupStackContact.contact?.first_name || "") +
        " " +
        (dupStackContact.contact?.last_name || "")
      ).trim();

      return fullname.length > acc.length ? fullname : acc;
    },
    ""
  );

  const reference = getDupstackReference(cachedDupStack);
  const confidentsAndReference =
    getDupstackConfidentsAndReference(cachedDupStack);
  const potentials = getDupstackPotentials(cachedDupStack);

  return (
    <Card className="grow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex flex-row items-center gap-2">
          {commonFullName}

          {loading && (
            <span className="flex flex-row items-center gap-1 text-gray-500">
              <Icons.spinner className="h-4 w-4 animate-spin" />
              <span className="text-xs font-light">merging</span>
            </span>
          )}

          {merged && (
            <span className="flex flex-row items-center gap-1 text-gray-500">
              <Icons.check className="h-4 w-4" />
              <span className="text-xs font-light">merged</span>

              <div className="flex ml-1">
                <a
                  href={URLS.external.hubspotContact(
                    workspace.hub_id,
                    reference.contact?.hs_id || 0
                  )}
                  target="_blank"
                  className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#fff1e8] px-1 py-1 gap-1"
                >
                  <span className="flex w-3 h-3 items-center justify-center">
                    <Icons.hubspot />
                  </span>
                </a>
              </div>
            </span>
          )}
        </CardTitle>
      </CardHeader>

      {!loading && !merged && (
        <>
          <CardContent>
            <div className="flex flex-col gap-y-1">
              {confidentsAndReference
                .sort((a, b) => {
                  if (!a.contact || !b.contact) return 0;

                  if (a.contact?.filled_score !== b.contact?.filled_score)
                    return b.contact.filled_score - a.contact.filled_score;

                  return b.contact.hs_id - a.contact.hs_id;
                })
                .map(
                  (dupStackContact, i) =>
                    dupStackContact.contact && (
                      <ContactDuplicateRow
                        key={i}
                        contact={dupStackContact.contact}
                        isReference={dupStackContact.dup_type === "REFERENCE"}
                        onUpdateDupType={onUpdateDupType(
                          dupStackContact.contact.id
                        )}
                      />
                    )
                )}

              <button
                onClick={onMerge}
                className="flex flex-row justify-center gap-1 items-center border border-black rounded-md text-sm px-2 py-1 hover:border-gray-500 hover:text-gray-600 disabled:text-gray-400 disabled:border-gray-300"
                disabled={
                  !confidentsAndReference || confidentsAndReference.length <= 1
                }
              >
                <Icons.merge className="w-4 h-4" />
                Merge {confidentsAndReference.length} contacts
              </button>
            </div>
          </CardContent>

          {potentials && potentials.length > 0 && (
            <CardGrayedContent>
              <div className="flex flex-col gap-y-1 pt-2">
                <p className="text-xs text-gray-600 py-1">
                  Potentials matches:
                </p>

                {potentials
                  .sort((a, b) => {
                    if (!a.contact || !b.contact) return 0;

                    if (a.contact?.filled_score !== b.contact?.filled_score)
                      return b.contact.filled_score - a.contact.filled_score;

                    return b.contact.hs_id - a.contact.hs_id;
                  })
                  .map(
                    (dupStackContact, i) =>
                      dupStackContact.contact && (
                        <ContactDuplicateRow
                          key={i}
                          contact={dupStackContact.contact}
                          isPotential
                          onUpdateDupType={onUpdateDupType(
                            dupStackContact.contact.id
                          )}
                        />
                      )
                  )}
              </div>
            </CardGrayedContent>
          )}
        </>
      )}
    </Card>
  );
}
