"use client";

import { ContactDuplicate } from "@/app/workspace/[workspaceId]/duplicates/contact-duplicate";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "@/types/supabase";
import {
  HsContactWithCompaniesType,
  HsDupStackType,
} from "@/utils/database-types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function DuplicatesPage() {
  const workspace = useWorkspace();
  const supabase = createClientComponentClient<Database>();

  const [contactsById, setContactsById] = useState<{
    [key: string]: HsContactWithCompaniesType;
  } | null>(null);

  const [dupStacks, setDupStacks] = useState<HsDupStackType[] | null>(null);

  useEffect(() => {
    async function fn() {
      // TODO: scale
      const { data: contacts, error: errorContacts } = await supabase
        .from("hs_contacts")
        .select("*, hs_companies(*)")
        .eq("workspace_id", workspace.id);
      if (errorContacts) {
        return Response.error();
      }

      const { data: dupStacks, error: errorDupStacks } = await supabase
        .from("hs_dup_stacks")
        .select()
        .eq("workspace_id", workspace.id);
      if (errorDupStacks) {
        return Response.error();
      }

      if (!contacts || !dupStacks) {
        throw new Error("Something went wrong!");
      }

      let contactsById: { [key: string]: HsContactWithCompaniesType } = {};
      contacts.forEach((contact) => {
        contactsById[contact.id] = contact;
      });

      setContactsById(contactsById);
      setDupStacks(dupStacks);
    }
    fn();
  }, [supabase, workspace.id]);

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
