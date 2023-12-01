import { captureException } from "@/lib/sentry";
import { URLS } from "@/lib/urls";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  console.log("middleware");
  try {
    const supabase = createMiddlewareClient({ req, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // if user is signed in and the current path is / redirect the user to /account
    if (session && req.nextUrl.pathname === "/") {
      console.log(
        "redirected1: ",
        new URL(URLS.workspaceIndex, process.env.NEXT_PUBLIC_URL!).toString()
      );
      return NextResponse.redirect(
        new URL(URLS.workspaceIndex, process.env.NEXT_PUBLIC_URL!)
      );
    }

    // if user is not signed in and the current path is not / redirect the user to /
    if (!session && req.nextUrl.pathname !== "/") {
      console.log(
        "redirected2: ",
        new URL(URLS.login, process.env.NEXT_PUBLIC_URL!).toString()
      );
      return NextResponse.redirect(
        new URL(URLS.login, process.env.NEXT_PUBLIC_URL!)
      );
    }

    console.log("hasSession: ", session ? true : false);
    console.log("session: ", session);

    const {
      data: { session: session2 },
    } = await supabase.auth.getSession();

    console.log("hasSession2: ", session2 ? true : false);
    console.log("session2: ", session2);
  } catch (error) {
    captureException(error);
  }

  console.log("middleware end");

  return res;
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/hubspot/:path*"],
};
