"use client";

import { Icons } from "@/components/icons";
import { Card } from "@/components/ui/card";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SyntheticEvent, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function SignUpPage({}) {
  const supabase = newSupabaseBrowserClient();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"SIGNUP" | "SUCCESS">("SIGNUP");

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function onSignUp(event: SyntheticEvent) {
    event.preventDefault();

    if (!emailRef.current || !passwordRef.current) {
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: emailRef.current.value,
      password: passwordRef.current.value,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);

      return;
    }

    setErrorMessage(null);
    setIsLoading(false);

    if (data.session) {
      router.push(URLS.workspaceIndex);
    } else {
      setMode("SUCCESS");
    }
  }

  return (
    <div className="h-screen w-screen flex flex-row items-center justify-center bg-gray-50">
      <Card className="m-4 p-4 w-96">
        <div className={cn("grid gap-4")}>
          {mode === "SIGNUP" ? (
            <>
              <div className="flex flex-col space-y-2 text-center">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Create an account
                </h1>

                <div className="text-sm flex flex-col items-start text-left py-2">
                  <ul className="mt-3 flex flex-col gap-2">
                    <li className="flex flex-row items-center gap-2">
                      <Icons.check className="text-purple-800 flex-none w-5 h-5" />
                      No need for a credit card
                    </li>

                    <li className="flex flex-row items-center gap-2">
                      <Icons.infos className="text-purple-800 flex-none w-5 h-5" />
                      We will require a HubSpot account
                    </li>
                  </ul>
                </div>
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

                  {errorMessage && (
                    <p className="text-red-500 mt-4">{errorMessage}</p>
                  )}

                  <p className="mt-2 px-8 text-center text-sm text-muted-foreground">
                    By clicking Sign up, you agree to our{" "}
                    <Link
                      href={URLS.external.termsOfService}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href={URLS.external.privacyPolicy}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </p>

                  <Button
                    disabled={isLoading}
                    className="mt-4"
                    onClick={onSignUp}
                  >
                    {isLoading && (
                      <Icons.spinner className="h-4 w-4 animate-spin text-black mr-2" />
                    )}
                    Sign up
                  </Button>
                </div>
              </form>

              <div className="flex justify-center items-center text-blue-800 underline text-sm">
                <Link href={URLS.login}>Login</Link>
              </div>
            </>
          ) : (
            <div className="text-center my-3">
              <p>We sent you a verification link in your mailbox</p>
              <p className="text-xs">
                (There may be up to 5 minutes delay in some cases)
              </p>

              <div className="flex justify-center items-center text-blue-800 underline text-sm mt-3">
                <Link href={URLS.login}>Go to homepage</Link>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
