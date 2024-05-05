import { Icons } from "@/components/icons";
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
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { URLS } from "@/lib/urls";

// TODO: Create a layout or something to ensure that user is logged in

export default async function WorkspaceIndexPage() {
  const supabase = newSupabaseServerClient();

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
              Let&apos;s connect your first workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="text-sm">
            <p>
              Click <b>Continue</b> to be securely redirected to HubSpot to
              authenticate your account.
            </p>

            <ul className="mt-3 flex flex-col gap-2">
              <li className="flex flex-row items-center gap-2">
                <Icons.check className="text-purple-800 flex-none w-5 h-5" />
                We won&apos;t modify data without your direct instructions
              </li>
              <li className="flex flex-row items-center gap-2">
                <Icons.check className="text-purple-800 flex-none w-5 h-5" />{" "}
                Disconnect Splinar at anytime from your HubSpot dashboard
              </li>
            </ul>

            <p className="mt-3">
              <b>Need Help?</b>{" "}
              <a
                className="text-blue-500 font-bold underline cursor-pointer"
                href="mailto:support@splinar.com"
              >
                Contact Support
              </a>
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
