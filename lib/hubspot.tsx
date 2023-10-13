import { Client } from "@hubspot/api-client";

export async function newHubspotClient(refreshToken: string) {
  let tmpClient = new Client();

  let client = await tmpClient.oauth.tokensApi
    .create(
      "refresh_token",
      undefined,
      undefined,
      process.env.HUBSPOT_CLIENT_ID!,
      process.env.HUBSPOT_SECRET!,
      refreshToken
    )
    .then((results) => {
      // this assigns the accessToken to the client, so your client is ready
      // to use
      tmpClient.setAccessToken(results.accessToken);

      return tmpClient;
    })
    .catch((reason) => {
      console.log(
        "Failed to create access token from refresh token: ",
        reason,
        refreshToken
      );

      return null;
    });

  if (!client) {
    throw new Error("Failed to create hubspot client");
  }

  return client;
}
