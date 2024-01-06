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

const spButtonVariants = cva("border rounded-lg text-sm font-medium", {
  variants: {
    variant: {
      // default: "bg-primary text-primary-foreground hover:bg-primary/90",
      // destructive:
      //   "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      ghost:
        "text-gray-400 border-transparent enabled:hover:text-black enabled:hover:border-gray-900 enabled:hover:bg-white ",

      outline:
        "text-black border-gray-400 enabled:hover:border-gray-900 enabled:hover:bg-white disabled:text-gray-400 disabled:border-gray-300",

      ghostActivated:
        "text-gray-600 border-gray-400 enabled:hover:text-black enabled:hover:border-gray-900",

      full: "bg-gray-700 border-gray-700 text-gray-100 enabled:hover:bg-gray-900 enabled:hover:border-gray-900 disabled:bg-gray-400 disabled:border-gray-400",

      fullAnimated:
        "bg-opacity-40 bg-white border-gray-700 text-black hover:bg-opacity-10 hover:border-gray-900",

      fullDanger:
        "bg-red-700 border-red-700 text-red-100 hover:bg-red-900 hover:border-red-900",

      // link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      icon: "p-1",
      sm: "py-0 px-1",
      md: "py-1 px-2",
      lg: "py-2 px-3",
    },
  },
  defaultVariants: {
    variant: "outline",
    size: "md",
  },
});

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
        className={cn(spButtonVariants({ variant, size, className }))}
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
        <div className="flex flex-row items-center justify-center gap-1">
          {!loading && Icon && <Icon className="w-4 h-4" />}
          {loading && <Icons.spinner className="w-4 h-4 animate-spin" />}

          <div>{children}</div>
        </div>
      </Comp>
    );
  }
);
SpButton.displayName = "SpButton";

export interface SpConfirmButtonProps extends SpIconButtonProps {
  confirmTitle?: string;
  confirmDescription?: string;
}

const SpConfirmButton = React.forwardRef<
  Merge<HTMLButtonElement, SpButtonProps>,
  SpConfirmButtonProps
>(({ children, confirmTitle, confirmDescription, onClick, ...props }, ref) => {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  return (
    <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
      <DialogTrigger asChild>
        <SpButton {...props}>{children}</SpButton>
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
});
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
