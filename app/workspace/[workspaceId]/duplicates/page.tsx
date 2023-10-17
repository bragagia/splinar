"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/context";
import { ContactDuplicate } from "@/app/workspace/[workspaceId]/duplicates/contact-duplicate";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactDuplicatesType, HsContactType } from "@/utils/database-types";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function DuplicatesPage() {
  const workspace = useWorkspace();

  const [contactsById, setContactsById] = useState<{
    [key: string]: HsContactType;
  } | null>(null);

  const [dupStacks, setDupStacks] = useState<ContactDuplicatesType[] | null>(
    null
  );

  useEffect(() => {
    async function fn() {
      const ret = await fetch("/api/duplicates/gen_contacts", {
        method: "POST",
      });
      const body = await ret.json();
      if (!body) {
        throw new Error("Something went wrong!");
      }

      const { contacts, dupStacks } = body as {
        contacts: HsContactType[];
        dupStacks: ContactDuplicatesType[];
      };
      if (!contacts || !dupStacks) {
        throw new Error("Something went wrong!");
      }

      let contactsById: { [key: string]: HsContactType } = {};
      contacts.forEach((contact) => {
        contactsById[contact.id] = contact;
      });

      setContactsById(contactsById);
      setDupStacks(dupStacks);
    }
    fn();
  }, []);

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Duplicates</h2>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">
            <span>
              Contacts
              {dupStacks && (
                <span className="font-light"> ({dupStacks.length})</span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
        </TabsList>

        {!contactsById || !dupStacks ? (
          <div className="w-full flex items-center justify-center h-72">
            <Icons.spinner className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <TabsContent value="contacts">
              {dupStacks?.length == 0 ? (
                <p>{"You've got no duplicates :)"}</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    {dupStacks?.map((dups, i) => (
                      <ContactDuplicate
                        key={i}
                        dupStack={dups}
                        contactsById={contactsById}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="companies">Not implemented yet</TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
