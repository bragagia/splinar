"use client";

import { initialFetch } from "@/app/serverActions/initial_fetch";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function OAuthCallback({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | undefined };
}) {
  let router = useRouter();

  let supabase = createClientComponentClient<Database>();

  const nameRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"INITIAL" | "FETCHING">("INITIAL");

  let refresh_token = searchParams["refresh_token"];
  let user_mail = searchParams["user_mail"];
  let hub_domain = searchParams["hub_domain"];
  let hub_id = searchParams["hub_id"];

  function onCancel() {
    router.push("/workspace");
  }

  async function onValidate() {
    if (!nameRef.current) {
      return;
    }

    if (nameRef.current.value === "") {
      setErrorMessage("Please fill all required fields");
      return;
    }

    if (!refresh_token || !user_mail || !hub_domain || !hub_id) {
      setErrorMessage(
        "Missing url parameters, please retry the whole process."
      );
      return;
    }

    const id = nanoid();
    const { error } = await supabase.from("workspaces").insert({
      id: id,
      refresh_token: refresh_token,
      domain: hub_domain,
      hub_id: hub_id,
      user_mail: user_mail,
      display_name: nameRef.current.value,
    });

    if (error) {
      setErrorMessage(
        "Something got bad, maybe you already added this workspace?"
      );
      throw error;
    }

    setStatus("FETCHING");

    try {
      initialFetch(id);
    } catch (e: any) {
      setErrorMessage(
        "There was an error while fetching your workspace data, please retry."
      );

      const { error } = await supabase.from("workspaces").delete().eq("id", id);
      if (error) {
        setErrorMessage("Something has gone really badly, please contact us.");
      }

      return;
    }

    router.push(URLS.workspace(id).dashboard);
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <Card className="m-8 max-w-lg w-[32rem]">
        {status === "INITIAL" ? (
          <>
            <CardHeader>
              <CardTitle>Add workspace</CardTitle>

              <CardDescription>
                Add <b>{hub_domain}</b> to your Splinar account
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    ref={nameRef}
                    id="name"
                    placeholder="Name of your workspace"
                  />
                </div>
              </form>
              {errorMessage && (
                <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>

              <Button onClick={onValidate}>Add workspace</Button>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Add workspace</CardTitle>

              <CardDescription>Fetching your account data</CardDescription>
            </CardHeader>

            <CardContent className="flex justify-center items-center">
              <Icons.spinner className="h-4 w-4 animate-spin" />
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
