"use client";

import { DupItemTypeType } from "@/app/workspace/[workspaceId]/duplicates/dup-stack-card";
import { Icons } from "@/components/icons";
import { SpIconButton } from "@/components/sp-button";
import { SpTooltip } from "@/components/sp-tooltip";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type DupStackRowColumnValueType = null | string | string[] | ReactNode;

export type DupStackRowColumnType = {
  value: DupStackRowColumnValueType;
  style: string;
  tips: string;
};

export type DupStackRowInfos = {
  hubspotLink: string;
  columns: DupStackRowColumnType[];
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
        "inline-flex flex-row items-center justify-between border border-transparent rounded-md px-1 py-0.5 group/linkbutton w-full gap-1 hover:bg-opacity-10",
        hoverHexColor
      )}
    >
      <div className="inline-flex flex-row items-center gap-1">
        {icon && (
          <div className={cn("flex items-center", iconHexColor)}>
            <span className="flex w-[10px] h-[10px] items-center justify-center">
              {icon}
            </span>
          </div>
        )}

        {children}
      </div>

      <Icons.arrowRight className="w-3 h-3 invisible group-hover/linkbutton:visible" />
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

  // Is ReactNode or string
  return (
    <p className={cn("break-words w-full max-w-full", className)}>{value}</p>
  );
}

export function DupStackCardRow({
  rowInfos,
  isPotential = false,
  isReference = false,
  expand = false,
  onUpdateDupType,
}: {
  rowInfos: DupStackRowInfos;
  isPotential?: boolean;
  isReference?: boolean;
  onUpdateDupType: (newDupType: DupItemTypeType) => void;
  expand?: boolean;
}) {
  const firstLineUntil = 4;
  const lastLineAfter =
    rowInfos.columns.length - (((rowInfos.columns.length - 1) % 4) + 1);
  const fillerCells = (4 - (rowInfos.columns.length % 4)) % 4;

  return (
    <div className="flex flex-col group">
      <div className="flex flex-row gap-3 text-sm">
        <div className={cn("grid grid-cols-4 w-full")}>
          {(expand ? rowInfos.columns : rowInfos.columns.slice(0, 4)).map(
            (column, i) => (
              <div
                key={i}
                className={cn(" p-1", {
                  "border-gray-100": !isPotential,
                  "border-gray-200": isPotential,
                  "border-t": expand && i / 4 >= 1,
                  "border-l": expand && i % 4 !== 0,
                  "pt-3": expand && i < firstLineUntil,
                  "pb-3": expand && i >= lastLineAfter,
                })}
              >
                <SpTooltip
                  className="flex flex-row items-center justify-center w-full h-full text-left"
                  tooltip={
                    i === 0 ? `Hubspot page (${column.tips})` : column.tips
                  }
                  align="start"
                >
                  {i === 0 ? (
                    <HubspotLinkButton href={rowInfos.hubspotLink}>
                      <DupStackRowInfo
                        value={column.value}
                        className={column.style}
                      />
                    </HubspotLinkButton>
                  ) : (
                    <DupStackRowInfo
                      value={column.value}
                      className={column.style}
                    />
                  )}
                </SpTooltip>
              </div>
            )
          )}

          {expand &&
            Array.from(
              { length: fillerCells },
              (_, i) => i + rowInfos.columns.length - 1
            ).map((i) => (
              <div
                key={i}
                className={cn(" p-1", {
                  "border-gray-100": !isPotential,
                  "border-gray-200": isPotential,
                  "border-t": expand && i / 4 >= 1,
                  "border-l": expand && i % 4 !== 0,
                  "pt-3": expand && i < firstLineUntil,
                  "pb-3": expand && i >= lastLineAfter,
                })}
              ></div>
            ))}
        </div>

        <div className="flex flex-row justify-end items-center gap-1">
          {!isPotential && (
            <>
              {isReference ? (
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
              ) : (
                <>
                  <SpTooltip tooltip="Mark as false positive">
                    <SpIconButton
                      variant="ghost"
                      className="invisible group-hover:visible"
                      icon={Icons.thumbDown}
                      onClick={() => onUpdateDupType("POTENTIAL")}
                    />
                  </SpTooltip>

                  <SpTooltip tooltip="Set as reference in which all other items will be merged">
                    <SpIconButton
                      variant="ghost"
                      className="invisible group-hover:visible"
                      icon={Icons.arrowsPointingIn}
                      onClick={() => onUpdateDupType("REFERENCE")}
                    />
                  </SpTooltip>
                </>
              )}
            </>
          )}

          {isPotential && (
            <>
              <button className="invisible border px-1 py-1 ">
                <div className="w-4 h-4" />
              </button>

              <SpTooltip tooltip="Add to merge list">
                <button
                  onClick={() => onUpdateDupType("CONFIDENT")}
                  className="border border-transparent rounded-lg text-sm px-1 py-1 text-gray-500  hover:bg-white hover:text-gray-600 hover:border-gray-600 group-hover:visible"
                >
                  <Icons.add className="w-4 h-4" />
                </button>
              </SpTooltip>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
