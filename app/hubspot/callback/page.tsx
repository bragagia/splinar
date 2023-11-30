import { URLS } from "@/lib/urls";
import { Client } from "@hubspot/api-client";
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

  redirect(
    URLS.absolute(
      URLS.hubspot.AddTeamValidation(
        getTokensResponse.refreshToken,
        getRefreshTokenResponse.user,
        getRefreshTokenResponse.hubDomain,
        getRefreshTokenResponse.hubId.toString()
      )
    )
  );
}
