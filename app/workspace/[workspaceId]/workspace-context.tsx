"use client";

import { Database } from "@/types/supabase";
import { WorkspaceType } from "@/types/workspaces";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MergeDeep } from "type-fest";

type WorkspaceContextType = MergeDeep<
  WorkspaceType,
  { triggerUpdate: () => void }
>;

export const WorkspaceContext = createContext<WorkspaceContextType | null>(
  null
);

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

  const forceUpdate = useCallback(async () => {
    const { data: workspaceUpdated, error } = await supabase
      .from("workspaces")
      .select()
      .eq("id", workspace.id)
      .limit(1)
      .single();
    if (error) {
      throw error;
    }

    setWorkspace(workspaceUpdated);
  }, [supabase, workspace.id]);

  useEffect(() => {
    setWorkspace(value);
    // TODO: Fix lost subscription
    supabase
      .channel("workspace-update")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "workspaces" },
        (payload) => {
          setWorkspace((workspace) => {
            if (payload.new.id !== workspace.id) {
              return workspace;
            }

            return {
              ...workspace,
              ...payload.new,
            };
          });
        }
      )
      .subscribe();
  }, [value, supabase]);

  const workspaceWithTrigger: WorkspaceContextType = {
    ...workspace,
    triggerUpdate: forceUpdate,
  };

  return (
    <WorkspaceContext.Provider value={workspaceWithTrigger}>
      {children}
    </WorkspaceContext.Provider>
  );
}
