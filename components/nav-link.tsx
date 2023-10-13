import { ReactNode } from "react";
import { NavLinkInternal } from "./nav-link-internal";

export function NavLink({
  href,
  exact = false,
  className,
  children,
  ...props
}: {
  href: string;
  exact?: boolean;
  className: (active: boolean) => string;
  children: ReactNode;
}) {
  return (
    <NavLinkInternal
      href={href}
      exact={exact}
      activeClassName={className(true)}
      inactiveClassName={className(false)}
      {...props}
    >
      {children}
    </NavLinkInternal>
  );
}
