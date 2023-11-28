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
import { URLS } from "@/lib/urls";
import {
  ContactWithCompaniesType,
  DupStackWithContactsAndCompaniesType,
  getDupstackConfidentsAndReference,
  getDupstackPotentials,
  getDupstackReference,
} from "@/types/database-types";
import { useEffect, useState } from "react";

export function ContactDuplicateRow({
  contact,
  isPotential = false,
  onUpgrade,
}: {
  contact: ContactWithCompaniesType;
  isPotential?: boolean;
  onUpgrade?: () => void;
}) {
  const workspace = useWorkspace();

  let fullname = (
    (contact.first_name || "") +
    " " +
    (contact.last_name || "")
  ).trim();

  return (
    <div className="flex flex-row rounded-md p-2 gap-3 text-sm">
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

      <div className="text-gray-700 flex flex-col items-start justify-center basis-48">
        {contact.companies && contact.companies.length > 0 ? (
          contact.companies?.map((company, i) => <p key={i}>{company.name}</p>)
        ) : (
          <span className="text-gray-500 font-light">-</span>
        )}
      </div>

      {isPotential && (
        <button
          onClick={onUpgrade}
          className="border border-black rounded-md text-sm px-1 py-1 bg-white hover:border-gray-500 hover:text-gray-600"
        >
          <Icons.add className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ContactDuplicate({
  dupStack,
}: {
  dupStack: DupStackWithContactsAndCompaniesType;
}) {
  const workspace = useWorkspace();
  const [cachedDupStack, setCachedDupStack] = useState(dupStack);
  const [merged, setMerged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setCachedDupStack(dupStack), [dupStack]);

  const onUpgradePotential = (id: string) => () => {
    // TODO: must save to db

    // TODO: Done this way, there is no garantee that the new confident contact is added at the end, maybe sort by score ?
    setCachedDupStack({
      ...cachedDupStack,
      dup_stack_contacts: cachedDupStack.dup_stack_contacts.map(
        (dupStackContact) => {
          if (dupStackContact.contact_id !== id) {
            return dupStackContact;
          } else {
            return {
              ...dupStackContact,
              dup_type: "CONFIDENT",
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
              {confidentsAndReference.map(
                (dupStackContact, i) =>
                  dupStackContact.contact && (
                    <ContactDuplicateRow
                      key={i}
                      contact={dupStackContact.contact}
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

                {potentials.map(
                  (dupStackContact, i) =>
                    dupStackContact.contact && (
                      <ContactDuplicateRow
                        key={i}
                        contact={dupStackContact.contact}
                        isPotential
                        onUpgrade={onUpgradePotential(
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
