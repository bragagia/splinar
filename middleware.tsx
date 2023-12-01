import { captureException } from "@/lib/sentry";
import { URLS } from "@/lib/urls";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  try {
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // if user is signed in and the current path is / redirect the user to /account
    if (session && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(
        new URL(URLS.workspaceIndex, process.env.NEXT_PUBLIC_URL!)
      );
    }

    // if user is not signed in and the current path is not / redirect the user to /
    if (!session && req.nextUrl.pathname !== "/") {
      return NextResponse.redirect(
        new URL(URLS.login, process.env.NEXT_PUBLIC_URL!)
      );
    }

    const {
      data: { session: session2 },
    } = await supabase.auth.getSession();
  } catch (error) {
    captureException(error);
  }

  return res;
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/hubspot/:path*"],
};
