import * as hubspot from "@hubspot/api-client";

export function setHubspotClientSearchLimit(client: hubspot.Client) {
  client.config.limiterOptions = {
    minTime: 550,
    maxConcurrent: 3,
    id: "search-hubspot-client-limiter",
  };
}

export async function newHubspotClient(
  refreshToken: string,
  limiter: "search" | "default" = "default"
) {
  let tmpClient = new hubspot.Client({
    limiterOptions:
      limiter === "search"
        ? {
            minTime: 550,
            maxConcurrent: 3,
            id: "search-hubspot-client-limiter",
          }
        : {
            minTime: 1000 / 9,
            maxConcurrent: 6,
            id: "hubspot-client-limiter",
          },
  });

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
