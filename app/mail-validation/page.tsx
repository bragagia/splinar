"use client";

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { URLS } from "@/lib/urls";
import { useRouter } from "next/navigation";

export default function MailValidationPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | undefined };
}) {
  const router = useRouter();
  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <Card className="m-8 max-w-lg w-[32rem]">
        <CardHeader>
          <CardTitle className="text-center">
            Your email is now verified!
          </CardTitle>
        </CardHeader>

        <CardFooter className="flex justify-center">
          <Button
            onClick={() => {
              router.push(URLS.workspaceIndex);
            }}
          >
            Click here to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
