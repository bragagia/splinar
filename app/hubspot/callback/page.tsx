import { URLS } from "@/lib/urls";
import { uuid } from "@/lib/uuid";
import { Database, TablesInsert } from "@/types/supabase";
import { Client } from "@hubspot/api-client";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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

  const cookieStore = cookies();
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  });

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
    installation_companies_dup_done: 0,
    installation_companies_dup_total: 0,
    installation_contacts_dup_done: 0,
    installation_contacts_dup_total: 0,
    installation_fetched: false,
    installation_companies_similarities_done_batches: 0,
    installation_companies_similarities_total_batches: 0,
    installation_contacts_similarities_done_batches: 0,
    installation_contacts_similarities_total_batches: 0,
  };

  const { error } = await supabase.from("workspaces").insert(workspace);
  if (error) {
    throw error;
  }

  redirect(URLS.workspace(workspaceId).dashboard);
}
