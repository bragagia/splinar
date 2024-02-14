"use client";

import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { Icons } from "@/components/icons";
import { SpIconButton } from "@/components/sp-button";
import { SpTooltip } from "@/components/sp-tooltip";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type DupStackRowColumnValueType =
  | null
  | string
  | string[]
  | ReactNode
  | (() => JSX.Element);

export type DupStackRowColumnType = {
  value: DupStackRowColumnValueType;
  style: string;
  tips: string;
  hubspotLink?: string;
};

export type DupStackRowInfos = {
  name: string;
  columns: DupStackRowColumnType[];
  dup_type: DupItemTypeType;
};

export function LinkButton({
  href,
  children,
  icon,
  iconHexColor,
  hoverHexColor,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  iconHexColor: string;
  hoverHexColor: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      className={cn(
        "inline-flex flex-row items-center justify-between border border-transparent rounded-md px-1 py-0.5 group/linkbutton w-full gap-1 hover:bg-opacity-10 -ml-1",
        hoverHexColor
      )}
    >
      <div className="inline-flex flex-row items-center gap-1 break-words">
        {icon && (
          <div className={cn("flex items-center", iconHexColor)}>
            <span className="flex w-[10px] h-[10px] items-center justify-center">
              {icon}
            </span>
          </div>
        )}

        {children}
      </div>

      <Icons.arrowRight className="w-3 h-3 shrink-0 invisible group-hover/linkbutton:visible" />
    </a>
  );
}

export function HubspotLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      icon={<Icons.hubspot />}
      iconHexColor="text-[#f8761f]"
      hoverHexColor="hover:bg-[#f8761f] hover:border-[#f8761f]"
    >
      {children}
    </LinkButton>
  );
}

export function FacebookLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      icon={<Icons.facebook className="w-3 h-3" />}
      iconHexColor="group-hover/linkbutton:text-[#1877F2]"
      hoverHexColor="hover:bg-[#1877F2] hover:border-[#1877F2]"
    >
      {children}
    </LinkButton>
  );
}

export function LinkedinLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      icon={<Icons.linkedin className="w-3 h-3" />}
      iconHexColor="group-hover/linkbutton:text-[#0077b5]"
      hoverHexColor="hover:bg-[#0077b5] hover:border-[#0077b5]"
    >
      {children}
    </LinkButton>
  );
}

export function TwitterLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      icon={<Icons.twitter className="w-3 h-3" />}
      iconHexColor="group-hover/linkbutton:text-[#1DA1F2]"
      hoverHexColor="hover:bg-[#1DA1F2] hover:border-[#1DA1F2]"
    >
      {children}
    </LinkButton>
  );
}

export function StandardLinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <LinkButton
      href={href}
      iconHexColor=""
      hoverHexColor="hover:bg-gray-400 hover:border-gray-400"
    >
      {children}
    </LinkButton>
  );
}

function DupStackRowInfo({
  value,
  className,
}: {
  value: DupStackRowColumnValueType;
  className?: string;
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return (
      <span className={cn("text-gray-400 font-light w-full max-w-full")}>
        -
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <p
        className={cn(
          "flex flex-col items-start justify-center w-full max-w-full",
          className
        )}
      >
        {value.map((v, i) => (
          <p className="break-words w-full max-w-full" key={i}>
            {v}
          </p>
        ))}
      </p>
    );
  }

  if (isJSXFunction(value)) {
    return (
      <div className={cn("break-words w-full max-w-full", className)}>
        {value()}
      </div>
    );
  }

  // Is ReactNode or string
  return (
    <div className={cn("break-words w-full max-w-full", className)}>
      {value}
    </div>
  );
}

function isJSXFunction(value: any): value is () => JSX.Element {
  return typeof value === "function" && value.length === 0;
}

function DupStackCardCell({
  columnData,
  isFirstLine,
  isLastLine,
  isCardExpanded,
}: {
  columnData?: DupStackRowColumnType;
  isFirstLine: boolean;
  isLastLine: boolean;
  isCardExpanded: boolean;
}) {
  return (
    <div
      className={cn("p-1 w-full", {
        // "border-gray-100": !isPotential,
        // "border-gray-200": isPotential,
        // "border-t": expand && i / 4 >= 1,
        // "border-l": expand && i % 4 !== 0,
        "border-b border-gray-200": isCardExpanded && !isLastLine,
        "pt-3": isCardExpanded && isFirstLine,
        "pb-3": isCardExpanded && isLastLine,
        "pt-2": !isCardExpanded && isFirstLine,
        "pb-2": !isCardExpanded && isLastLine,
      })}
    >
      {columnData && (
        <SpTooltip
          className="flex flex-col items-start justify-center w-full h-full text-left"
          tooltip={
            columnData.hubspotLink
              ? `HubSpot page (${columnData.tips})`
              : columnData.tips
          }
          align="start"
        >
          {columnData.hubspotLink ? (
            <HubspotLinkButton href={columnData.hubspotLink}>
              <DupStackRowInfo
                value={columnData.value}
                className={columnData.style}
              />
            </HubspotLinkButton>
          ) : (
            <DupStackRowInfo
              value={columnData.value}
              className={columnData.style}
            />
          )}
        </SpTooltip>
      )}
    </div>
  );
}

export function DupStackCardRow({
  rowInfos,
  expand = false,
  onUpdateDupType,
}: {
  rowInfos: DupStackRowInfos;
  onUpdateDupType: (newDupType: DupItemTypeType) => void;
  expand?: boolean;
}) {
  const firstLineUntil = 3;
  const lastLineAfter = Math.floor((rowInfos.columns.length - 2) / 3) * 3; // - 1 for the name column and -1 to prevent full last line to be considered not the last
  //const fillerCells = (4 - (rowInfos.columns.length % 4)) % 4;

  return (
    <div className={cn("flex flex-col group")}>
      <div className="flex flex-row gap-3 text-sm">
        <div className={cn("grid grid-cols-4 w-full")}>
          <div
            className={cn(
              "col-span-1 flex flex-row items-center justify-stretch w-full"
            )}
          >
            <DupStackCardCell
              columnData={rowInfos.columns[0]}
              isFirstLine={true}
              isLastLine={true}
              isCardExpanded={expand}
            />
          </div>

          <div className={cn("col-span-3 spa grid grid-cols-3 w-full")}>
            {(expand
              ? rowInfos.columns.slice(1)
              : rowInfos.columns.slice(1).slice(0, 3)
            ).map((column, i) => (
              <DupStackCardCell
                key={i}
                columnData={column}
                isFirstLine={i < firstLineUntil}
                isLastLine={i >= lastLineAfter}
                isCardExpanded={expand}
              />
            ))}

            {/* {expand &&
              Array.from(
                { length: fillerCells },
                (_, i) => i + rowInfos.columns.length - 1
              ).map((i) => (
                <DupStackCardCell
                  key={i}
                  isFirstLine={i < firstLineUntil}
                  isLastLine={i >= lastLineAfter}
                  isCardExpanded={expand}
                />
              ))} */}
          </div>
        </div>

        <div className="flex flex-row justify-end items-center gap-1">
          {rowInfos.dup_type === "REFERENCE" && (
            <>
              <button className="invisible border px-1 py-1 ">
                <div className="w-4 h-4" />
              </button>

              <SpTooltip
                tooltip="This is the reference in which all other items will be merged"
                icon={<Icons.infos />}
              >
                <SpIconButton
                  variant="ghostActivated"
                  disabled
                  icon={Icons.arrowsPointingIn}
                />
              </SpTooltip>
            </>
          )}

          {rowInfos.dup_type === "CONFIDENT" && (
            <>
              <SpTooltip tooltip="Mark as false positive">
                <SpIconButton
                  variant="grayedGhost"
                  className="invisible group-hover:visible"
                  icon={Icons.thumbDown}
                  onClick={() => onUpdateDupType("FALSE_POSITIVE")}
                />
              </SpTooltip>

              <SpTooltip tooltip="Set as reference in which all other items will be merged">
                <SpIconButton
                  variant="grayedGhost"
                  className="invisible group-hover:visible"
                  icon={Icons.arrowsPointingIn}
                  onClick={() => onUpdateDupType("REFERENCE")}
                />
              </SpTooltip>
            </>
          )}

          {rowInfos.dup_type === "POTENTIAL" && (
            <>
              <SpTooltip tooltip="Mark as false positive">
                <SpIconButton
                  variant="grayedGhost"
                  icon={Icons.thumbDown}
                  onClick={() => onUpdateDupType("FALSE_POSITIVE")}
                />
              </SpTooltip>

              <SpTooltip tooltip="Add to merge list">
                <SpIconButton
                  variant="grayedGhost"
                  icon={Icons.add}
                  onClick={() => onUpdateDupType("CONFIDENT")}
                />
              </SpTooltip>
            </>
          )}

          {rowInfos.dup_type === "FALSE_POSITIVE" && (
            <>
              <button className="invisible border px-1 py-1 ">
                <div className="w-4 h-4" />
              </button>

              <SpTooltip tooltip="Add to merge list">
                <SpIconButton
                  variant="grayedGhost"
                  className="invisible group-hover:visible"
                  icon={Icons.add}
                  onClick={() => onUpdateDupType("CONFIDENT")}
                />
              </SpTooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
