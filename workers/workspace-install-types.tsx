export const WorkspaceInstallId = "workspaceInstall";

export type WorkspaceInstallWorkerArgs = {
  supabaseSession: {
    refresh_token: string;
    access_token: string;
  };
  workspaceId: string;
  softInstall: boolean;
};
