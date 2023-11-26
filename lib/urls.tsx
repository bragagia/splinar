const base = process.env.NEXT_PUBLIC_URL!;

export const URLS = {
  absolute: (path: string) => base + path,

  login: "/",

  // Retuns a link to last workspace if teamId is null
  workspace: (workspaceId: string) => ({
    dashboard: `/workspace/${workspaceId}/dashboard`,
    duplicates: `/workspace/${workspaceId}/duplicates`,
    settings: `/workspace/${workspaceId}/settings`,
    api: {
      reset: `/workspace/${workspaceId}/api/reset`,
      install: `/workspace/${workspaceId}/api/install`,
      testAction: `/workspace/${workspaceId}/api/test-action`,
    },
  }),

  workspaceIndex: `/workspace/`,

  hubspot: {
    AddTeamValidation: (
      refreshToken: string,
      userMail: string,
      hubDomain: string,
      hubId: string
    ) => {
      let url = new URL("/hubspot/add-team-validation", base);

      url.searchParams.append("refresh_token", refreshToken);
      url.searchParams.append("user_mail", userMail);
      url.searchParams.append("hub_domain", hubDomain);
      url.searchParams.append("hub_id", hubId);

      return url.pathname + "?" + url.searchParams.toString();
    },

    callback: `${base}/hubspot/callback`, // Must be exactly the same as in hubspot config
  },

  external: {
    hubspotOAuth:
      "https://app-eu1.hubspot.com/oauth/authorize?client_id=1e3368cb-a326-4217-943d-0f9a14a91f07&redirect_uri=https://app.splinar.com/hubspot/callback&scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.objects.companies.write%20crm.schemas.contacts.read%20crm.objects.companies.read%20crm.schemas.companies.read",
    hubspotContact: (workspaceHubId: string, hsId: number) =>
      "https://app.hubspot.com/contacts/" +
      workspaceHubId +
      "/record/0-1/" +
      hsId,
  },
};
