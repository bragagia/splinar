"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function NavLinkInternal({
  href,
  exact,
  activeClassName,
  inactiveClassName,
  children,
  ...props
}: {
  href: string;
  exact: boolean;
  activeClassName: string;
  inactiveClassName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={isActive ? activeClassName : inactiveClassName}
      {...props}
    >
      {children}
    </Link>
  );
}
