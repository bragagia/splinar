import { workerInit } from "@/workers/init";
import {
  WorkspaceInstallId,
  workspaceInstallProcessor,
} from "@/workers/workspace-install";

workerInit(WorkspaceInstallId, workspaceInstallProcessor);
