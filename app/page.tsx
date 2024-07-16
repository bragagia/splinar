"use client";

import { UserAuthForm } from "@/components/user-auth-form";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const supabase = newSupabaseBrowserClient();

  useEffect(() => {
    // Note: This code is important, because supabase is shit and when a user click on the email validation link, the shit validation doesn't work on SSR.
    // So this page must be on "use client" so that the getSession and redirect will happend on client side. Yay.
    // TODO: That may be because i used getSession instead of getUser that would check status on server side

    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data.session?.user.id) {
        router.push(URLS.workspaceIndex);
      }
    });
  }, [supabase, router]);

  return (
    <>
      <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
          <div className="absolute inset-0 bg-zinc-900" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            Splinar
          </div>
          <div className="relative z-20 mt-auto">
            <blockquote className="space-y-2">
              <p className="text-lg">Put an end to bad data in hubspot.</p>
            </blockquote>
          </div>
        </div>

        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <UserAuthForm />
          </div>
        </div>
      </div>
    </>
  );
}
