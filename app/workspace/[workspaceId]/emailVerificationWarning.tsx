"use client";

import { SpButton } from "@/components/sp-button";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { User } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";

export function EmailVerificationWarning({ user }: { user: User }) {
  const supabase = newSupabaseBrowserClient();
  const [hasBeenResent, setHasBeenResent] = useState<boolean>(false);

  if (user.email_confirmed_at) {
    return <></>;
  }

  async function resend() {
    if (hasBeenResent) {
      return;
    }

    await supabase.auth.resend({
      type: "signup",
      email: user.email || "",
    });

    setHasBeenResent(true);
  }

  return (
    <div className="m-3 rounded-md bg-orange-100 border border-orange-500 text-orange-800 p-3 text-sm flex flex-col gap-2">
      <p className="font-bold">Unverified account</p>

      <p>Please click the link in your email to verify your account.</p>

      <p>
        <span className="mr-2">Didn&apos;t receive the email?</span>

        {hasBeenResent ? (
          <span className="italic">Done! Check your mailbox ;)</span>
        ) : (
          <SpButton colorClass="orange" variant="full" onClick={resend}>
            Resend
          </SpButton>
        )}
      </p>
    </div>
  );
}
