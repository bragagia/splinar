import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// TODO: Create a layout or something to ensure that user is logged in

export default async function WorkspaceIndexPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    throw sessionError || new Error("Missing session");
  }

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select()
    .eq("user_id", sessionData.session.user.id);

  if (error) {
    return <p>Something got wrong</p>;
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <Card className="m-8 max-w-lg w-[32rem]">
          <CardHeader>
            <CardTitle>Welcome to Splinar!</CardTitle>
            <CardDescription>
              Let&apos;s add your first workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-sm">
              You will be redirected to HubSpot, please follow their
              instructions.
            </p>
          </CardContent>

          <CardFooter className="flex justify-end">
            <a href={URLS.external.hubspotOAuth}>
              <Button>Continue</Button>
            </a>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <Card className="m-8 max-w-lg w-[32rem]">
        <CardHeader>
          <CardTitle>Welcome to Splinar!</CardTitle>
          <CardDescription>
            Which workspace do you want to work on?
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-1">
          {workspaces.map((workspace, i) => (
            <a
              href={URLS.workspace(workspace.id).dashboard}
              key={i}
              className="-mx-2 flex items-center space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <Avatar className="mr-2 h-full">
                <AvatarImage
                  src={`https://avatar.vercel.sh/${workspace.id}.png`}
                  alt={workspace.domain}
                />
                <AvatarFallback>
                  {workspace.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 text-left">
                <p className="text-sm font-medium leading-none">
                  {workspace.display_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {workspace.domain}
                </p>
              </div>
            </a>
          ))}
        </CardContent>

        <CardFooter className="flex justify-end">
          <a href={URLS.external.hubspotOAuth}>
            <Button variant="outline">Add a new workspace</Button>
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
