import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import React, { ReactNode } from "react";

const spButtonVariants = cva("border rounded-lg text-sm", {
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

      full: "bg-gray-500 border-gray-500 text-gray-100 hover:bg-gray-700 hover:border-gray-700",
      // link: "text-primary underline-offset-4 hover:underline",
    },
    size: {
      sm: "p-none",
      md: "p-1",
      lg: "p-2",
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
        className={cn(spButtonVariants({ variant, size, className }))}
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
      ...props
    },
    ref
  ) => {
    const Icon = icon;
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(spButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        <div className="flex flex-row items-center justify-center gap-1">
          {Icon && <Icon className="w-4 h-4" />}

          <div>{children}</div>
        </div>
      </Comp>
    );
  }
);
SpButton.displayName = "SpButton";

export { SpButton };
