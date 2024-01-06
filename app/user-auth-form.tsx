"use client";

import { Icons } from "@/components/icons";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HTMLAttributes, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

interface UserAuthFormProps extends HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onLogin() {
    if (!emailRef.current || !passwordRef.current) {
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailRef.current.value,
      password: passwordRef.current.value,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);

      return;
    }

    if (!data.user) {
      setErrorMessage("Unkown error");
      setIsLoading(false);

      return;
    }

    // note: We let the loading until the next page load
    // setIsLoading(false);
    setErrorMessage(null);
    router.push(URLS.workspaceIndex);
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back!</h1>
        <p className="text-sm text-muted-foreground">
          {"Let's eradicate those duplicates"}
        </p>
      </div>

      <form>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>

            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              ref={emailRef}
            />

            <Label className="sr-only" htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              placeholder="password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              disabled={isLoading}
              ref={passwordRef}
            />
          </div>

          {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}

          <Button disabled={isLoading} className="mt-4" onClick={onLogin}>
            {isLoading && (
              <Icons.spinner className="h-4 w-4 animate-spin text-black" />
            )}
            Login
          </Button>
        </div>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <div className="flex justify-center items-center text-blue-800 underline">
        <Link href={URLS.signUp}>Create an account</Link>
      </div>
    </div>
  );
}
