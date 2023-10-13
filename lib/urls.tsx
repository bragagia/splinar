const base = process.env.NEXT_PUBLIC_URL!;

export const URLS = {
  absolute: (path: string) => base + path,

  login: "/",

  // Retuns a link to last workspace if teamId is null
  workspace: (teamId: string) => ({
    dashboard: `/workspace/${teamId}/dashboard`,
    duplicates: `/workspace/${teamId}/duplicates`,
    settings: `/workspace/${teamId}/settings`,
  }),

  workspaceIndex: `/workspace/`,

  hubspot: {
    AddTeamValidation: (
      refreshToken: string,
      userMail: string,
      hubDomain: string
    ) => {
      let url = new URL("/hubspot/add-team-validation", base);

      url.searchParams.append("refresh_token", refreshToken);
      url.searchParams.append("user_mail", userMail);
      url.searchParams.append("hub_domain", hubDomain);

      return url.pathname + "?" + url.searchParams.toString();
    },

    callback: `${base}/hubspot/callback`, // Must be exactly the same as in hubspot config
  },

  external: {
    hubspotOAuth:
      "https://app-eu1.hubspot.com/oauth/authorize?client_id=1e3368cb-a326-4217-943d-0f9a14a91f07&redirect_uri=http://localhost:3000/hubspot/callback&scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.objects.companies.write%20crm.schemas.contacts.read%20crm.objects.companies.read%20crm.schemas.companies.read",
  },
};
