import { Card, CardTitle } from "@/components/ui/card";
import { newSupabaseServerClient } from "@/lib/supabase/server";
import { URLS } from "@/lib/urls";
import { uuid } from "@/lib/uuid";
import { TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import Link from "next/link";
import { redirect } from "next/navigation";

const GRANT_TYPES = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
};

export default async function OAuthCallback({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [key: string]: string | undefined };
}) {
  let code = searchParams["code"];

  if (!code) {
    return <p>Missing hubspot code</p>;
  }

  const supabase = newSupabaseServerClient();

  const hubspotClient = new Client({});

  // https://developers.hubspot.com/docs/api/working-with-oauth
  try {
    var getTokensResponse = await hubspotClient.oauth.tokensApi.create(
      GRANT_TYPES.AUTHORIZATION_CODE,
      code,
      URLS.hubspot.callback,
      process.env.HUBSPOT_CLIENT_ID!,
      process.env.HUBSPOT_SECRET!
    );

    var getRefreshTokenResponse =
      await hubspotClient.oauth.refreshTokensApi.get(
        getTokensResponse.refreshToken
      );
  } catch (error) {
    return <p>{JSON.stringify(error)}</p>;
  }

  if (
    !getTokensResponse.refreshToken ||
    !getRefreshTokenResponse.user ||
    !getRefreshTokenResponse.hubDomain
  ) {
    // TODO: better error handling
    return <p>Missing info from hubspot</p>;
  }

  const workspaceId = uuid();
  const workspace: TablesInsert<"workspaces"> = {
    id: workspaceId,
    refresh_token: getTokensResponse.refreshToken,
    domain: getRefreshTokenResponse.hubDomain,
    hub_id: getRefreshTokenResponse.hubId.toString(),
    user_mail: getRefreshTokenResponse.user,
    display_name: "",
    installation_status: "FRESH",
  };

  const { error } = await supabase.from("workspaces").insert(workspace);
  if (error) {
    return (
      <div className="h-screen w-screen flex flex-row items-center justify-center bg-gray-50">
        <Card className="m-4 p-4 w-96">
          <CardTitle>
            This HubSpot workspace is already linked to Splinar.
          </CardTitle>

          <div className="flex justify-center items-center text-blue-800 underline text-sm">
            <Link href={URLS.workspaceIndex}>Go back</Link>
          </div>
        </Card>
      </div>
    );
  }

  redirect(URLS.workspace(workspaceId).dashboard);
}
