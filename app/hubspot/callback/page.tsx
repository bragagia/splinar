import { URLS } from "@/lib/urls";
import { Client } from "@hubspot/api-client";
import { redirect } from "next/navigation";

const APP_CLIENT_ID = "1e3368cb-a326-4217-943d-0f9a14a91f07";
const APP_SECRET = "ac5adc6f-f597-45b9-bbc2-f42df06d598c";

const ACCESS_CODE = "eu1-e6c9-0609-41fb-8ec4-c6d9fa867cb0";

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
      APP_CLIENT_ID,
      APP_SECRET
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
