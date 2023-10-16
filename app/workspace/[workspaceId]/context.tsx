"use client";

import { Database } from "@/types/supabase";
import { ReactNode, createContext, useContext } from "react";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  let workspace = useContext(WorkspaceContext);

  if (!workspace) {
    throw new Error("Missing workspace context");
  }

  return workspace;
}

export function WorkspaceContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: Workspace;
}) {
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
