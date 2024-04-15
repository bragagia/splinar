"use client";

import { cancelWorkspaceSubscription } from "@/app/workspace/[workspaceId]/billing/cancel-workspace-subscription";
import { createPortalSession } from "@/app/workspace/[workspaceId]/billing/create-portal-session";
import { addCouponSubscription } from "@/app/workspace/[workspaceId]/settings/addCouponSubscription";
import { workspaceReset } from "@/app/workspace/[workspaceId]/settings/workspace-reset";
import { useUser } from "@/app/workspace/[workspaceId]/user-context";
import { useWorkspace } from "@/app/workspace/[workspaceId]/workspace-context";
import {
  SpAnimatedButton,
  SpButton,
  SpConfirmButton,
} from "@/components/sp-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { areItemsDups } from "@/inngest/dedup/dup-stacks/are-items-dups";
import { evalSimilarities } from "@/inngest/dedup/similarity/eval-similarities";
import { getItemFieldsValues, listItemFields } from "@/lib/items_common";
import { newSupabaseBrowserClient } from "@/lib/supabase/browser";
import { URLS } from "@/lib/urls";
import { Tables } from "@/types/supabase";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
const util = require("util");

export default function WorkspaceSettingsPageClient({
  subscription,
}: {
  subscription: Tables<"workspace_subscriptions"> | null;
}) {
  const supabase = newSupabaseBrowserClient();
  const workspace = useWorkspace();
  const router = useRouter();
  const user = useUser();
  const couponDateRef = useRef<HTMLInputElement>(null);
  const itemCheck1Ref = useRef<HTMLInputElement>(null);
  const itemCheck2Ref = useRef<HTMLInputElement>(null);

  const [resetWorkspaceLoading, setResetWorkspaceLoading] = useState(false);
  const [couponEndDate, setCouponEndDate] = useState<string | undefined>();
  const [itemCheck1Val, setItemCheck1Val] = useState<string | undefined>();
  const [itemCheck2Val, setItemCheck2Val] = useState<string | undefined>();
  const [dupCheckResult, setDupCheckResult] = useState<string | undefined>();

  async function onResetWorkspace(
    reset: "dup_stacks" | "full" | "similarities_and_dup"
  ) {
    setResetWorkspaceLoading(true);

    await workspaceReset(workspace.id, reset);

    workspace.triggerUpdate();

    router.push(URLS.workspace(workspace.id).dashboard);
  }

  async function onDeleteWorkspace() {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    router.push(URLS.workspaceIndex);
  }

  const onCheckDupStatus = useCallback(async () => {
    if (!itemCheck1Val || !itemCheck2Val) {
      return;
    }

    // TODO: Put this in server action to prevent the dupcheck code to be sent to front
    const items = await supabase
      .from("items")
      .select()
      .eq("workspace_id", workspace.id)
      .in("distant_id", [itemCheck1Val, itemCheck2Val]);
    if (items.error) {
      setDupCheckResult(JSON.stringify(items.error, null, 2));
      return;
    }
    if (!items.data || items.data.length != 2) {
      setDupCheckResult("Couldn't fetch one of the two items");
      return;
    }

    const a = items.data[0];
    const b = items.data[1];

    let res = "";
    const log = (...str: any[]) => {
      res += util.format(...str) + "\n";
    };

    log("A:", JSON.stringify(getItemFieldsValues(a), null, 2));
    log("A:", listItemFields(a));
    log(" ");
    log(" ");

    log("B:", JSON.stringify(getItemFieldsValues(b), null, 2));
    log("A:", listItemFields(b));
    log(" ");
    log(" ");

    const similarities = evalSimilarities(workspace.id, a, b);

    log("### Similarities: ");
    if (similarities.length === 0) {
      log("No similarities");
    } else {
      log(
        similarities.map((similarity) => ({
          field_type: similarity.field_type,
          similarity_score: similarity.similarity_score,
          a: similarity.item_a_value,
          b: similarity.item_b_value,
        }))
      );
    }

    log(" ");
    log(" ");

    log("### Dup check:");
    const dupRes = areItemsDups(
      { ...a, similarities: similarities as Tables<"similarities">[] },
      { ...b, similarities: similarities as Tables<"similarities">[] },
      log
    );

    log(" ");
    log(" ");

    log("Dup result:", dupRes);

    setDupCheckResult(res);
  }, [supabase, workspace.id, itemCheck1Val, itemCheck2Val]);

  return (
    <div className="flex-1 space-y-4 w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Workspace settings
        </h2>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              {subscription ? (
                <>
                  <CardTitle className="text-xl">Billing</CardTitle>
                  <CardDescription>Current plan: Enterprise</CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-xl">
                    Currently on free tier
                  </CardTitle>
                  <CardDescription>
                    Limited to your 5000 last contacts and companies
                  </CardDescription>
                </>
              )}
            </div>

            {subscription ? (
              subscription.canceled_at === null ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <SpButton
                    variant="outline"
                    onClick={async () =>
                      await createPortalSession(workspace.id)
                    }
                  >
                    Manage subscription
                  </SpButton>

                  <SpConfirmButton
                    colorClass="red"
                    variant="full"
                    confirmDescription="Are you sure? Your subscription will remain active until the end of current cycle."
                    onClick={async () => {
                      await cancelWorkspaceSubscription(workspace.id);
                      //setCancelModalOpen(false);
                      location.reload();
                    }}
                  >
                    Cancel subscription
                  </SpConfirmButton>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <SpButton variant="outline" disabled>
                    Subscription canceled
                  </SpButton>

                  <p className="text-sm text-gray-400">
                    End on{" "}
                    {dayjs(subscription.canceled_at).format("YYYY-MM-DD")}
                  </p>
                </div>
              )
            ) : (
              <div>
                <SpAnimatedButton
                  size="lg"
                  onClick={() =>
                    router.push(URLS.workspace(workspace.id).billing.index)
                  }
                >
                  View subscription options
                </SpAnimatedButton>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Dangerous zone</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="performance" className="flex flex-col space-y-1">
              <span className="font-normal leading-snug text-muted-foreground">
                Delete the workspace and all its associated datas. Any billing
                will be stopped.
              </span>
            </Label>

            <SpConfirmButton
              className="shrink-0"
              colorClass="red"
              variant="full"
              onClick={onDeleteWorkspace}
            >
              Delete workspace
            </SpConfirmButton>
          </div>
        </CardContent>
      </Card>

      {/* SUPERADMIN SECTION */}
      {(user.role === "SUPERADMIN" ||
        process.env.NODE_ENV === "development") && (
        <>
          <Card className="border-red-400">
            <CardHeader>
              <CardTitle className="text-xl">Superadmin zone</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="performance"
                  className="flex flex-col space-y-1"
                >
                  <div className="flex flex-row space-x-1 items-center">
                    <span className="font-normal leading-snug text-muted-foreground">
                      A:
                    </span>

                    <input
                      ref={itemCheck1Ref}
                      className="border border-gray-400 rounded-md p-1"
                      onChange={() =>
                        setItemCheck1Val(itemCheck1Ref.current?.value)
                      }
                    />
                  </div>

                  <div className="flex flex-row space-x-1 items-center">
                    <span className="font-normal leading-snug text-muted-foreground">
                      B:
                    </span>

                    <input
                      ref={itemCheck2Ref}
                      className="border border-gray-400 rounded-md p-1"
                      onChange={() =>
                        setItemCheck2Val(itemCheck2Ref.current?.value)
                      }
                    />
                  </div>
                </Label>

                <SpButton
                  className="shrink-0"
                  variant="full"
                  onClick={onCheckDupStatus}
                >
                  Check dup status
                </SpButton>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="performance"
                  className="flex flex-col space-y-1"
                >
                  <span className="font-normal leading-snug text-muted-foreground">
                    Any information stored like &quot;Not a duplicate&quot;
                    flags will be lost /!\
                  </span>
                </Label>

                <SpButton
                  className="shrink-0"
                  colorClass="red"
                  variant="full"
                  onClick={() => onResetWorkspace("dup_stacks")}
                  disabled={resetWorkspaceLoading}
                >
                  Reset dup stacks
                </SpButton>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="performance"
                  className="flex flex-col space-y-1"
                >
                  <span className="font-normal leading-snug text-muted-foreground">
                    -
                  </span>
                </Label>

                <SpButton
                  className="shrink-0"
                  colorClass="red"
                  variant="full"
                  onClick={() => onResetWorkspace("similarities_and_dup")}
                  disabled={resetWorkspaceLoading}
                >
                  Reset similarities
                </SpButton>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="performance"
                  className="flex flex-col space-y-1"
                >
                  <span className="font-normal leading-snug text-muted-foreground">
                    Note: Merged data stats will be kept
                  </span>
                </Label>

                <SpButton
                  className="shrink-0"
                  colorClass="red"
                  variant="full"
                  onClick={() => onResetWorkspace("full")}
                  disabled={resetWorkspaceLoading}
                >
                  Reset all workspace datas
                </SpButton>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label
                  htmlFor="performance"
                  className="flex flex-col space-y-1"
                >
                  <span className="font-normal leading-snug text-muted-foreground">
                    End date:
                  </span>

                  <input
                    ref={couponDateRef}
                    type="date"
                    className="border border-gray-400 rounded-md p-1"
                    onChange={() =>
                      setCouponEndDate(couponDateRef.current?.value)
                    }
                  />
                </Label>

                <SpButton
                  className="shrink-0"
                  variant="full"
                  onClick={async () => {
                    await addCouponSubscription(
                      workspace.id,
                      dayjs(couponEndDate || "").toISOString()
                    );

                    location.reload();
                  }}
                  disabled={subscription || !couponEndDate ? true : false}
                >
                  Add coupon subscription
                </SpButton>
              </div>
            </CardContent>
          </Card>

          {dupCheckResult && (
            <Card className="border-red-400">
              <CardHeader>
                <CardTitle className="text-xl">DupCheck result</CardTitle>
              </CardHeader>

              <CardContent className="flex flex-col">
                {dupCheckResult.split("\n").map((line, i) => (
                  <p key={i} className="min-h-[20px]">
                    {line}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
      {/* END OF SUPERADMIN SECTION */}
    </div>
  );
}
