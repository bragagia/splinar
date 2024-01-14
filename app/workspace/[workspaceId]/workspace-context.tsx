"use client";

import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { Database, Tables } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { usePathname } from "next/navigation";
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
  Tables<"workspaces">,
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
  value: Tables<"workspaces">;
}) {
  const supabase = createClientComponentClient<Database>();
  const pathName = usePathname();
  const user = useUser();

  const [workspace, setWorkspace] = useState<Tables<"workspaces">>(value);

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
    // Force update whenever pathName change
    forceUpdate();
  }, [forceUpdate, pathName]);

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
    <>
      {user.role === "SUPERADMIN" && workspace.user_id !== user.id && (
        <div className="border-8 border-red-500 border-blink h-screen w-screen top-0 left-0 animate-pulse-fast fixed pointer-events-none z-50"></div>
      )}

      <WorkspaceContext.Provider value={workspaceWithTrigger}>
        {children}
      </WorkspaceContext.Provider>
    </>
  );
}
