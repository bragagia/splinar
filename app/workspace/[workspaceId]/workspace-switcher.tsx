"use client";

import { cn } from "@/lib/utils";

import {
  CaretSortIcon,
  CheckIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";

import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../../../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface WorkspaceSwitcherProps extends PopoverTriggerProps {}

export default function WorkspaceSwitcher({
  className,
}: WorkspaceSwitcherProps) {
  let user = useUser();
  let currentWorkspace = useWorkspace();

  let router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceType[] | null>(
    null
  );
  const [open, setOpen] = React.useState(false);
  const [showNewWorkspaceDialog, setShowNewWorkspaceDialog] =
    React.useState(false);
  const [filterOnUser, setFilterOnUser] = React.useState<string | null>(
    currentWorkspace.user_id
  );

  useEffect(() => {
    const fn = async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select()
        .order("created_at"); // Filter for superadmin case

      if (error) {
        // TODO:
        return;
      }

      setAllWorkspaces(data as WorkspaceType[]);
    };
    fn();
  }, [supabase, user]);

  async function onAddWorkspace() {
    window.open(URLS.external.hubspotOAuth, "_blank");
    setShowNewWorkspaceDialog(false);
  }

  function onSelectWorkspace(id: string) {
    setOpen(false);
    router.push(URLS.workspace(id).dashboard);
  }

  const filteredWorkspaces = filterOnUser
    ? allWorkspaces?.filter(
        (workspace) => workspace.user_id === filterOnUser
      ) || []
    : allWorkspaces || [];

  return (
    <Dialog
      open={showNewWorkspaceDialog}
      onOpenChange={setShowNewWorkspaceDialog}
    >
      {user.role === "SUPERADMIN" && (
        <UserSwitcher
          currentWorkspace={currentWorkspace}
          allWorkspaces={allWorkspaces}
          onFilterOnUser={setFilterOnUser}
        />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a workspace"
            className={cn("w-[200px] justify-between", className)}
          >
            {currentWorkspace ? (
              <>
                <Avatar className="mr-2 h-5 w-5">
                  <AvatarImage
                    src={`https://avatar.vercel.sh/${currentWorkspace.id}.png`}
                    alt={currentWorkspace.domain}
                  />
                  <AvatarFallback>SC</AvatarFallback>
                </Avatar>
                <p className="whitespace-nowrap overflow-hidden text-ellipsis">
                  {currentWorkspace.display_name}
                </p>
              </>
            ) : (
              "Select a workspace"
            )}
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>

              <CommandGroup heading="Workspaces">
                {filteredWorkspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    onSelect={() => onSelectWorkspace(workspace.id)}
                    className="text-sm"
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${workspace.id}.png`}
                        alt={workspace.domain}
                      />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>

                    {workspace.display_name}

                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        currentWorkspace.id === workspace.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowNewWorkspaceDialog(true);
                    }}
                  >
                    <PlusCircledIcon className="mr-2 h-5 w-5" />
                    Add workspace
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add workspace</DialogTitle>
          <DialogDescription>
            Link your Splinar account to a new hubspot workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 pb-4 text-sm">
          <p>
            You will be redirected to Hubspot, please follow their instructions.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNewWorkspaceDialog(false)}
          >
            Cancel
          </Button>

          <Button type="submit" onClick={onAddWorkspace}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserSwitcher({
  currentWorkspace,
  allWorkspaces,
  onFilterOnUser,
}: {
  currentWorkspace: WorkspaceType;
  allWorkspaces: WorkspaceType[] | null;
  onFilterOnUser: (user: string | null) => void;
}) {
  let user = useUser();

  const [open, setOpen] = React.useState(false);

  const [filteredOnUser, setFilteredOnUser] = useState<string | null>(
    currentWorkspace.user_id
  );

  const allUserIds = useMemo(() => {
    let allUsers: {
      [key: string]: string;
    } = {};

    allWorkspaces?.forEach((workspace) => {
      if (workspace.user_id !== user.id)
        allUsers[workspace.user_id] = workspace.user_id;
    });

    return Object.keys(allUsers).sort((a, b) =>
      a.localeCompare(b, "en", { numeric: true })
    );
  }, [allWorkspaces]);

  function onSelectUser(userId: string | null) {
    setOpen(false);

    setFilteredOnUser(userId);
    onFilterOnUser(userId);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a user"
          className={cn("w-[200px] justify-between mr-2", {
            "bg-red-500": filteredOnUser !== user.id,
          })}
        >
          {filteredOnUser ? (
            <p className="whitespace-nowrap overflow-hidden text-ellipsis">
              {filteredOnUser === user.id && "You : "}
              {filteredOnUser}
            </p>
          ) : (
            "All users"
          )}
          <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>

            <CommandGroup heading="Filter workspaces on:">
              <CommandItem
                onSelect={() => onSelectUser(null)}
                className="text-sm"
              >
                All users
                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    filteredOnUser === null ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              <CommandItem
                onSelect={() => onSelectUser(user.id)}
                className="text-sm"
              >
                {"You: "}

                {user.id}

                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    filteredOnUser === user.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>

              {allUserIds.map((userId, i) => (
                <CommandItem
                  key={i}
                  onSelect={() => onSelectUser(userId)}
                  className="text-sm"
                >
                  {userId === user.id && <b className="mr-1">You:</b>}

                  {userId}

                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      filteredOnUser === userId ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
