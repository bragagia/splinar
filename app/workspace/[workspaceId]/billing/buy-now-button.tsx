"use client";

import { createCheckoutSession } from "@/app/workspace/[workspaceId]/billing/create-checkout-session";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import { SpAnimatedButton } from "@/components/sp-button";

export function BuyNowButton() {
  const workspace = useWorkspace();

  return (
    <div className="mt-10 w-full flex">
      <SpAnimatedButton
        size="lg"
        className="w-full"
        id="checkout-and-portal-button"
        type="submit"
        onClick={async () => await createCheckoutSession(workspace.id)}
      >
        Get started now
      </SpAnimatedButton>
    </div>
  );
}
