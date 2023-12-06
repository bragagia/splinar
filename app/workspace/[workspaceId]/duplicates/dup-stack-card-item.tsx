"use client";

import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { Icons } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DupStackRowColumnType = {
  value: null | string | string[];
  style: string;
};

export type DupStackRowInfos = {
  hubspotLink: string;
  columns: DupStackRowColumnType[];
};

export function DupStackCardRow({
  rowInfos,
  isPotential = false,
  isReference = false,
  onUpdateDupType,
}: {
  rowInfos: DupStackRowInfos;
  isPotential?: boolean;
  isReference?: boolean;
  onUpdateDupType: (newDupType: DupItemTypeType) => void;
}) {
  const workspace = useWorkspace();

  return (
    <div className="flex flex-row rounded-md p-2 gap-3 text-sm group">
      <div className="font-medium flex items-center gap-2">
        <div className="flex">
          <a
            href={rowInfos.hubspotLink}
            target="_blank"
            className="flex items-center rounded-md border border-[#f8761f] text-[#f8761f] bg-white hover:bg-[#fff1e8] px-1 py-1 gap-1"
          >
            <span className="flex w-3 h-3 items-center justify-center">
              <Icons.hubspot />
            </span>
          </a>
        </div>
      </div>

      {rowInfos.columns.map((column, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col items-start justify-center",
            column.style
          )}
        >
          {(!column.value ||
            (Array.isArray(column.value) && column.value.length === 0)) && (
            <span className="text-gray-500 font-light">-</span>
          )}

          {typeof column.value === "string" && column.value}

          {Array.isArray(column.value) &&
            column.value.map((v, i) => <p key={i}>{v}</p>)}
        </div>
      ))}

      <div className="flex flex-row justify-end items-center gap-2">
        <TooltipProvider delayDuration={400} skipDelayDuration={1}>
          {!isPotential && (
            <>
              {isReference ? (
                <>
                  <button className="invisible border px-1 py-1 ">
                    <div className="w-4 h-4" />
                  </button>

                  <Tooltip>
                    <TooltipTrigger>
                      <div className="border rounded-lg text-sm px-1 py-1 bg-white text-gray-600 border-gray-600">
                        <Icons.arrowsPointingIn className="w-4 h-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <div className="flex flex-row items-center gap-1">
                        <Icons.infos />
                        <p>
                          This is the reference in which all other items will be
                          merged
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => onUpdateDupType("POTENTIAL")}
                        className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-400 invisible hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                      >
                        <Icons.thumbDown className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <p>Mark as false positive</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger>
                      <button
                        onClick={() => onUpdateDupType("REFERENCE")}
                        className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-400 invisible hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                      >
                        <Icons.arrowsPointingIn className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={10}>
                      <p>
                        Set as reference in which all other items will be merged
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </>
          )}

          {isPotential && (
            <>
              <button className="invisible border px-1 py-1 ">
                <div className="w-4 h-4" />
              </button>

              <Tooltip>
                <TooltipTrigger>
                  <button
                    onClick={() => onUpdateDupType("CONFIDENT")}
                    className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-500  hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                  >
                    <Icons.add className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={10}>
                  <p>Add to merge list</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}
