"use client";

import { AnimatedBgBuy } from "@/components/animated-bg-buy";
import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import React, { ReactNode, useState } from "react";
import { Merge } from "type-fest";

const spButtonVariants = cva(
  "border rounded-lg text-sm font-medium outline-none",
  {
    variants: {
      variant: {
        ghost:
          "text-[--color-text] border-transparent enabled:hover:text-[--color-text] enabled:hover:border-[--color-900] enabled:hover:bg-white",

        grayedGhost:
          "text-[--color-400] border-transparent enabled:hover:text-[--color-text] enabled:hover:border-[--color-900] enabled:hover:bg-white",

        outline:
          "text-[--color-text] bg-white border-[--color-400] enabled:hover:border-[--color-900] enabled:hover:bg-white disabled:text-[--color-400] disabled:border-[--color-400]",

        ghostActivated:
          "text-[--color-700] border-[--color-400] enabled:hover:text-[--color-text] enabled:hover:border-[--color-900]",

        full: "bg-[--color-700] border-[--color-700] text-[--color-100] enabled:hover:bg-[--color-900] enabled:hover:border-[--color-900] disabled:bg-[--color-400] disabled:border-[--color-400]",

        fullAnimated:
          "bg-opacity-40 bg-white border-[--color-700] text-[--color-text] hover:bg-opacity-10 hover:border-[--color-900]",
      },
      colorClass: {
        black: [
          "[--color-100:theme(colors.gray.100)]",
          "[--color-400:theme(colors.gray.400)]",
          "[--color-700:theme(colors.gray.700)]",
          "[--color-900:theme(colors.gray.900)]",
          "[--color-text:theme(colors.black)]",
        ],
        red: [
          "[--color-100:theme(colors.red.100)]",
          "[--color-400:theme(colors.red.400)]",
          "[--color-700:theme(colors.red.700)]",
          "[--color-900:theme(colors.red.900)]",
          "[--color-text:theme(colors.black)]",
        ],
        green: [
          "[--color-100:theme(colors.green.100)]",
          "[--color-400:theme(colors.green.600)]",
          "[--color-700:theme(colors.green.700)]",
          "[--color-900:theme(colors.green.900)]",
          "[--color-text:theme(colors.black)]",
        ],
        orange: [
          "[--color-100:theme(colors.orange.100)]",
          "[--color-400:theme(colors.orange.600)]",
          "[--color-700:theme(colors.orange.700)]",
          "[--color-900:theme(colors.orange.900)]",
          "[--color-text:theme(colors.black)]",
        ],
      },
      size: {
        icon: "p-1",
        sm: "py-0 px-1",
        md: "py-1 px-2",
        lg: "py-2 px-3",
      },
    },
    defaultVariants: {
      colorClass: "black",
      variant: "outline",
      size: "md",
    },
  }
);

export { spButtonVariants };

export interface SpIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof spButtonVariants> {
  asChild?: boolean;
  icon?: (props: any) => JSX.Element;
  disabled?: boolean;
}

const SpIconButton = React.forwardRef<HTMLButtonElement, SpIconButtonProps>(
  (
    { className, variant, size, asChild = false, icon, disabled, ...props },
    ref
  ) => {
    const Icon = icon;
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(spButtonVariants({ variant, size: "icon", className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {Icon && <Icon className="w-4 h-4" />}
      </Comp>
    );
  }
);
SpIconButton.displayName = "SpIconButton";

export { SpIconButton };

export interface SpButtonProps extends SpIconButtonProps {
  children: ReactNode;
}

const SpButton = React.forwardRef<HTMLButtonElement, SpButtonProps>(
  (
    {
      className,
      variant,
      colorClass,
      size,
      asChild = false,
      icon,
      disabled,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const Icon = icon;
    const Comp = asChild ? Slot : "button";

    const [loading, setLoading] = useState(false);

    return (
      <Comp
        className={cn(
          spButtonVariants({ variant, colorClass, size, className })
        )}
        ref={ref}
        disabled={disabled || loading}
        onClick={async (event: any) => {
          if (onClick) {
            setLoading(true);
            await onClick(event);
            setLoading(false);
          }
        }}
        {...props}
      >
        <div className="flex flex-row items-center justify-center gap-1 w-full">
          {!loading && Icon && <Icon className="w-4 h-4" />}
          {loading && <Icons.spinner className="w-4 h-4 animate-spin" />}

          {children}
        </div>
      </Comp>
    );
  }
);
SpButton.displayName = "SpButton";

export interface SpConfirmButtonProps extends SpIconButtonProps {
  confirmTitle?: string;
  confirmDescription?: string;
  classic?: boolean;
}

const SpConfirmButton = React.forwardRef<
  Merge<HTMLButtonElement, SpButtonProps>,
  SpConfirmButtonProps
>(
  (
    { children, confirmTitle, confirmDescription, onClick, classic, ...props },
    ref
  ) => {
    const [cancelModalOpen, setCancelModalOpen] = useState(false);

    return (
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogTrigger asChild>
          {classic ? (
            <button {...props}>{children}</button>
          ) : (
            <SpButton {...props}>{children}</SpButton>
          )}
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle ? confirmTitle : children}</DialogTitle>

            <DialogDescription>
              {confirmDescription ? confirmDescription : "Are you sure?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <SpButton
              type="submit"
              {...props}
              onClick={
                onClick
                  ? async (event: any) => {
                      await onClick(event);
                      setCancelModalOpen(false);
                    }
                  : undefined
              }
            >
              {children}
            </SpButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
SpConfirmButton.displayName = "SpConfirmButton";

const SpAnimatedButton = React.forwardRef<HTMLButtonElement, SpButtonProps>(
  ({ variant = "fullAnimated", ...props }, ref) => {
    return (
      <AnimatedBgBuy className="rounded-md">
        <SpButton {...props} variant={"fullAnimated"} />
      </AnimatedBgBuy>
    );
  }
);
SpAnimatedButton.displayName = "SpAnimatedButton";

export { SpAnimatedButton, SpButton, SpConfirmButton };
