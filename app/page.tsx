"use client";

import { UserAuthForm } from "@/app/user-auth-form";
import { URLS } from "@/lib/urls";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  console.log("page");

  const supabase = createClientComponentClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      console.log("result");
      if (!error && data.session?.user.id) {
        console.log("redirect");
        redirect(URLS.workspaceIndex);
      }
    }); // TODO: remove, middleware does that
  }, [supabase]);

  console.log("page content");

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
              <p className="text-lg">
                &ldquo;Your pipe has never been that smooth.&rdquo;
              </p>
              <footer className="text-sm">La Team Pipe</footer>
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
