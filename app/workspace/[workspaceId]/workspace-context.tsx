"use client";

import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/utils/database-types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export const WorkspaceContext = createContext<WorkspaceType | null>(null);

export function useWorkspace() {
  let workspace = useContext(WorkspaceContext);

  if (!workspace) {
    throw new Error("Missing workspace context");
  }

  return workspace;
}

export function WorkspaceProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WorkspaceType;
}) {
  const supabase = createClientComponentClient<Database>();

  const [workspace, setWorkspace] = useState<WorkspaceType>(value);

  useEffect(() => {
    setWorkspace(value);
    // TODO: Fix lost subscription
    supabase
      .channel("workspace-update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workspaces" },
        (payload) => {
          setWorkspace((workspace) => ({
            ...workspace,
            ...payload.new,
          }));
        }
      )
      .subscribe();
  }, [value, supabase]);

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}
