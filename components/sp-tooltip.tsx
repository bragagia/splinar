import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export function SpTooltip({
  children,
  tooltip,
  className,
  icon,
  align,
}: {
  children: ReactNode;
  tooltip: string;
  className?: string;
  icon?: ReactNode;
  align?: "center" | "start" | "end" | undefined;
}) {
  return (
    <TooltipProvider delayDuration={400} skipDelayDuration={1}>
      <Tooltip>
        <TooltipTrigger className={cn("cursor-auto", className)}>
          {children}
        </TooltipTrigger>

        <TooltipContent sideOffset={10} align={align}>
          <div className="flex flex-row items-center gap-1">
            {icon}

            <div>
              {tooltip.split("\n").map((str, i) => (
                <p key={i}>{str}</p>
              ))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
