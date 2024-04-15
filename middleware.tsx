import { captureException } from "@/lib/sentry";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { URLS } from "@/lib/urls";

import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  try {
    const { response, userRes } = await updateSupabaseSession(req);

    const user = userRes.data?.user;
    // if user is signed in and the current path is / redirect the user to /account
    if (user && req.nextUrl.pathname === "/") {
      return NextResponse.redirect(
        new URL(URLS.workspaceIndex, process.env.NEXT_PUBLIC_URL!)
      );
    }

    // if user is not signed in and the current path is not / redirect the user to /
    if (!user && req.nextUrl.pathname !== "/") {
      return NextResponse.redirect(
        new URL(URLS.login, process.env.NEXT_PUBLIC_URL!)
      );
    }

    return response;
  } catch (error) {
    console.log("catched error");
    captureException(error);
  }
}

export const config = {
  matcher: ["/", "/workspace/:path*", "/hubspot/:path*"],
};
