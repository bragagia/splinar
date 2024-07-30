import * as hubspot from "@hubspot/api-client";
import IConfiguration from "@hubspot/api-client/lib/src/configuration/IConfiguration";

export const MAX_HUBSPOT_PROPERTIES_PER_REQUEST = 250; // Has been tested to work up to 615

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
  const config: IConfiguration = {
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
    numberOfApiCallRetries: 3,
  };

  let tmpClient = new hubspot.Client(config);

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

export function convertOutputPropertyToHubspotProperty(
  outputProperty: string[] | string | null | undefined
): string {
  if (outputProperty === null || outputProperty === undefined) {
    return "";
  }

  if (typeof outputProperty === "string") {
    return outputProperty;
  }

  return outputProperty.join(";");
}
