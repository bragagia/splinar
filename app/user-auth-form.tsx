"use client";

import { Icons } from "@/components/icons";
import { URLS } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { Database } from "@/types/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HTMLAttributes, SyntheticEvent, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

interface UserAuthFormProps extends HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"SIGNUP" | "LOGIN">("SIGNUP");

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
    } else {
      setErrorMessage(null);
    }

    setIsLoading(false);

    if (data.user) {
      router.push(URLS.workspaceIndex);
    }
  }

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
    } else {
      setErrorMessage(null);
    }

    setIsLoading(false);

    if (data.session) {
      router.push(URLS.workspaceIndex);
    } else {
      setErrorMessage("We sent you a verification mail ;)");
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      {mode === "SIGNUP" ? (
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            No need for a credit card
          </p>
        </div>
      ) : (
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back!
          </h1>
          <p className="text-sm text-muted-foreground">
            {"Let's eradicate those duplicates"}
          </p>
        </div>
      )}

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
              placeholder="••••"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              disabled={isLoading}
              ref={passwordRef}
            />
          </div>

          {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}

          {mode === "LOGIN" ? (
            <Button disabled={isLoading} className="mt-4" onClick={onLogin}>
              {isLoading && (
                <Icons.spinner className="h-4 w-4 animate-spin text-black" />
              )}
              Login
            </Button>
          ) : (
            <>
              <Button disabled={isLoading} className="mt-4" onClick={onSignUp}>
                {isLoading && (
                  <Icons.spinner className="h-4 w-4 animate-spin text-black" />
                )}
                Sign up
              </Button>

              <p className="mt-2 px-8 text-center text-sm text-muted-foreground">
                By clicking Sign up, you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </>
          )}
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
        <a
          href="#"
          onClick={() => {
            setErrorMessage(null);
            setMode(mode === "LOGIN" ? "SIGNUP" : "LOGIN");
          }}
        >
          {mode === "LOGIN" ? "Create an account" : "Login to your account"}
        </a>
      </div>
    </div>
  );
}
