"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/context";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { NavLink } from "../../../components/nav-link";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  let workspace = useWorkspace();

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <NavLink
        href={URLS.workspace(workspace.id).dashboard}
        exact
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        Overview
      </NavLink>

      <NavLink
        href={URLS.workspace(workspace.id).duplicates}
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        Duplicates
      </NavLink>

      <NavLink
        href={URLS.workspace(workspace.id).settings}
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        Settings
      </NavLink>
    </nav>
  );
}
