"use client";

import { ContactType } from "@/app/serverActions/contacts_similarity_check";
import { workspaceDupDetect } from "@/app/serverActions/workspace_dup_detect";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

export default function DuplicatesPage() {
  const [contactsById, setContactsById] = useState<{
    [key: string]: ContactType;
  } | null>(null);
  const [dupStacks, setDupStacks] = useState<string[][] | null>(null);

  useEffect(() => {
    async function fn() {
      const ret = await workspaceDupDetect();
      if (!ret) {
        return;
      }

      const { contacts, dupStacks } = ret;

      let contactsById: { [key: string]: ContactType } = {};
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
                    {dupStacks?.map((dups, i) => {
                      let fullName = dups.reduce((acc, contactId) => {
                        let fullname =
                          contactsById[contactId].first_name +
                          " " +
                          contactsById[contactId].last_name;

                        return fullname.length > acc.length ? fullname : acc;
                      }, "");

                      return (
                        <Card key={i} className="grow">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">
                              {fullName}
                            </CardTitle>
                          </CardHeader>

                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>ID</TableHead>
                                  <TableHead>First name</TableHead>
                                  <TableHead>Last name</TableHead>
                                  <TableHead>Emails</TableHead>
                                  <TableHead>Phones</TableHead>
                                </TableRow>
                              </TableHeader>

                              {dups.map((dup, i) => {
                                let contact = contactsById[dup];

                                /* <span></span>
                          <span></span>
                          <span></span>
                          <span>{contact.emails}</span>
                          <span>{contact.phones}</span> */

                                return (
                                  <TableBody key={i}>
                                    <TableRow>
                                      <TableCell className="font-medium">
                                        {contact.hs_id}
                                      </TableCell>

                                      <TableCell>
                                        {contact.first_name}
                                      </TableCell>

                                      <TableCell>{contact.last_name}</TableCell>

                                      <TableCell>
                                        {contact.emails?.map((email, i) => (
                                          <p key={i}>{email}</p>
                                        ))}
                                      </TableCell>

                                      <TableCell>
                                        {contact.phones?.map((phone, i) => (
                                          <p key={i}>{phone}</p>
                                        ))}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                );
                              })}
                            </Table>

                            <Button className="mt-3" size="sm">
                              Merge {dups.length} contacts
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
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
