"use client";

import { Icons } from "@/components/icons";
import { URLS } from "@/lib/urls";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect, useParams } from "next/navigation";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  let workspace = useContext(WorkspaceContext);

  if (!workspace) {
    throw new Error("Missing workspace context");
  }

  return workspace;
}

export function WorkspaceIdContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams();

  let currentWorkspaceId = params.workspaceId as string | undefined;
  if (!currentWorkspaceId) {
    redirect(URLS.workspaceIndex);
  }

  const supabase = createClientComponentClient<Database>();

  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );

  useEffect(() => {
    async function fn() {
      const { data: workspaces, error } = await supabase
        .from("workspaces")
        .select();
      if (error) {
        throw error;
      }

      console.log("workspaces set", workspaces);

      setWorkspaces(workspaces);
    }
    fn();
  }, [supabase]);

  useEffect(() => {
    if (!workspaces) {
      return;
    }

    let workspace = workspaces.find((w) => w.id == currentWorkspaceId);

    if (!workspace) {
      redirect(URLS.workspaceIndex);
    }

    console.log("current workspace", workspace);

    setCurrentWorkspace(workspace);
  }, [workspaces, currentWorkspaceId]);

  if (!currentWorkspace) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <Icons.spinner className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider value={currentWorkspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
