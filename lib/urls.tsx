import { ItemTypeT } from "@/lib/items_common";

const base = process.env.NEXT_PUBLIC_URL!;

export const URLS = {
  absolute: (path: string) => base + path,

  login: "/",
  signUp: "/sign-up",

  // Retuns a link to last workspace if teamId is null
  workspace: (workspaceId: string) => ({
    dashboard: `/workspace/${workspaceId}/dashboard`,

    dataCleaning: `/workspace/${workspaceId}/data-cleaning`,
    dataCleaningReview: (filterByJobId?: string) =>
      `/workspace/${workspaceId}/data-cleaning/review` +
      (filterByJobId ? `?jobId=${filterByJobId}` : ""),
    dataCleaningJob: (jobId: string) =>
      `/workspace/${workspaceId}/data-cleaning/job/${jobId}`,

    duplicates: `/workspace/${workspaceId}/duplicates`,
    duplicatesSettings: (itemType: ItemTypeT) =>
      `/workspace/${workspaceId}/duplicates/settings?itemType=${itemType}`,

    settings: `/workspace/${workspaceId}/settings`,
    billing: {
      index: `/workspace/${workspaceId}/billing`,
      canceled: `/workspace/${workspaceId}/billing?canceled=true`,
    },
  }),

  workspaceIndex: `/workspace/`,

  hubspot: {
    callback: `${base}/hubspot/callback`, // Must be exactly the same as in hubspot config
  },

  external: {
    termsOfService: "https://splinar.com/terms",
    privacyPolicy: "https://splinar.com/privacy-policy",
    hubspotOAuth:
      "https://app-eu1.hubspot.com/oauth/authorize?client_id=1e3368cb-a326-4217-943d-0f9a14a91f07&redirect_uri=https://app.splinar.com/hubspot/callback&scope=crm.objects.contacts.read%20crm.objects.contacts.write%20crm.objects.companies.write%20crm.schemas.contacts.read%20crm.objects.companies.read%20crm.schemas.companies.read", // TODO: Need to create local dev hubspot app
    hubspotContact: (workspaceHubId: string, distantId: string) =>
      "https://app.hubspot.com/contacts/" +
      workspaceHubId +
      "/record/0-1/" +
      distantId,
    hubspotCompany: (workspaceHubId: string, distantId: string) =>
      // This condition is for the demo component to link to base hubspot account
      workspaceHubId
        ? "https://app.hubspot.com/contacts/" +
          workspaceHubId +
          "/record/0-2/" +
          distantId
        : "https://app.hubspot.com/contacts/",
  },
};
