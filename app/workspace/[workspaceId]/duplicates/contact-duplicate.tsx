import { contactMerge } from "@/app/serverActions/contacts_merge";
import { ContactType } from "@/app/serverActions/contacts_similarity_check";
import { ContactDuplicatesType } from "@/app/serverActions/resolve_duplicates_stacks";
import { useWorkspace } from "@/app/workspace/[workspaceId]/context";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardGrayedContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { URLS } from "@/lib/urls";
import { useEffect, useState } from "react";

export function ContactDuplicateRow({
  contact,
  isPotential = false,
  onUpgrade,
}: {
  contact: ContactType;
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
      <div className="font-medium flex items-center gap-2 basis-48">
        <div className="flex">
          <a
            href={URLS.external.hubspotContact(workspace.hub_id, contact.hs_id)}
            target="_blank"
            className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#ffeadd] px-2 py-1 gap-1"
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

      <div className="text-gray-700 flex flex-col items-start justify-center basis-48">
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

      {isPotential && (
        <button
          onClick={onUpgrade}
          className="border border-black rounded-md text-sm px-1 py-1 hover:border-gray-500 hover:text-gray-600"
        >
          <Icons.add className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ContactDuplicate({
  dupStack,
  contactsById,
}: {
  dupStack: ContactDuplicatesType;
  contactsById: {
    [key: string]: ContactType;
  };
}) {
  const workspace = useWorkspace();
  const [cachedDupStack, setCachedDupStack] = useState(dupStack);
  const [merged, setMerged] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => setCachedDupStack(dupStack), [dupStack]);

  const onUpgradePotential = (id: string) => () => {
    setCachedDupStack({
      confidents: [...cachedDupStack.confidents, id],
      potentials: cachedDupStack.potentials.filter((v) => v !== id),
    });
  };

  const onMerge = async () => {
    setLoading(true);
    await contactMerge(
      workspace.id,
      contactsById[cachedDupStack.confidents[0]].hs_id,
      cachedDupStack.confidents.slice(1).map((id) => contactsById[id].hs_id)
    );
    setLoading(false);
    setMerged(true);
  };

  let commonFullName = cachedDupStack.confidents.reduce((acc, contactId) => {
    let fullname = (
      (contactsById[contactId].first_name || "") +
      " " +
      (contactsById[contactId].last_name || "")
    ).trim();

    return fullname.length > acc.length ? fullname : acc;
  }, "");

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
                    contactsById[dupStack.confidents[0]].hs_id
                  )}
                  target="_blank"
                  className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#ffeadd] px-1 py-1 gap-1"
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
              {cachedDupStack.confidents.map((dup, i) => (
                <ContactDuplicateRow key={i} contact={contactsById[dup]} />
              ))}

              <button
                onClick={onMerge}
                className="flex flex-row justify-center gap-1 items-center border border-black rounded-md text-sm px-2 py-1 hover:border-gray-500 hover:text-gray-600 disabled:text-gray-400 disabled:border-gray-300"
                disabled={
                  !cachedDupStack.confidents ||
                  cachedDupStack.confidents.length <= 1
                }
              >
                <Icons.merge className="w-4 h-4" />
                Merge {cachedDupStack.confidents.length} contacts
              </button>
            </div>
          </CardContent>

          {cachedDupStack.potentials.length > 0 && (
            <CardGrayedContent>
              <div className="flex flex-col gap-y-1 pt-2">
                <p className="text-xs text-gray-600 py-1">
                  Potentials matches:
                </p>

                {cachedDupStack.potentials.map((dup, i) => (
                  <ContactDuplicateRow
                    key={i}
                    contact={contactsById[dup]}
                    isPotential
                    onUpgrade={onUpgradePotential(dup)}
                  />
                ))}
              </div>
            </CardGrayedContent>
          )}
        </>
      )}
    </Card>
  );
}
