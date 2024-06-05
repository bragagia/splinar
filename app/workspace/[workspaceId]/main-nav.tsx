"use client";

import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
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
        1. Health check
      </NavLink>

      <NavLink
        href={URLS.workspace(workspace.id).dataCleaning}
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        2. Data cleaning
      </NavLink>

      <NavLink
        href={URLS.workspace(workspace.id).duplicates}
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        3. Duplicates
      </NavLink>

      <NavLink
        href={URLS.workspace(workspace.id).settings}
        className={(active) =>
          cn("text-sm font-medium transition-colors hover:text-primary", {
            "text-muted-foreground": !active,
          })
        }
      >
        <Icons.settings className="w-5 h-5" />
      </NavLink>
    </nav>
  );
}
