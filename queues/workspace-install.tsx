import {
  WorkspaceInstallWorkerArgs,
  WorkspaceInstallId,
} from "@/workers/workspace-install-types";
import { Queue } from "bullmq";

import Redis from "ioredis";
const connection = new Redis(process.env.REDIS_URL!, {
  password: process.env.REDIS_PASSWORD!,
  tls: {
    checkServerIdentity: (hostname, cert) => {
      return undefined; // TODO: Big security concern
    },
  },
  maxRetriesPerRequest: null,
});

export const workspaceInstallQueue = new Queue<
  WorkspaceInstallWorkerArgs,
  void
>(WorkspaceInstallId, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

// async function workspaceInstall(
//   supabaseSession: {
//     refresh_token: string;
//     access_token: string;
//   },
//   workspaceId: string,
//   softInstall: boolean = false
// ) {
//   await deferCatch(async () => {
//     console.log("### Workspace Install", workspaceId);

//     const startTime = performance.now();

//     const supabase = createClient<Database>(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     );
//     const { error } = await supabase.auth.setSession(supabaseSession);
//     if (error) {
//       throw error;
//     }

//     console.log("### Updating workspace status");
//     let workspaceUpdatePending: Partial<WorkspaceType> = {
//       installation_status: "PENDING",
//     };
//     await supabase
//       .from("workspaces")
//       .update(workspaceUpdatePending)
//       .eq("id", workspaceId);

//     if (!softInstall) {
//       console.log(
//         "### Fetching hubspot data",
//         " # Time: ",
//         Math.round((performance.now() - startTime) / 1000)
//       );
//       await fullFetch(supabase, workspaceId);
//       await updateDupStackInstallationTotal(supabase, workspaceId);
//     }

//     console.log(
//       "### Install similarities",
//       " # Time: ",
//       Math.round((performance.now() - startTime) / 1000)
//     );
//     await installSimilarities(supabase, workspaceId);

//     console.log(
//       "### Install dup stacks",
//       " # Time: ",
//       Math.round((performance.now() - startTime) / 1000)
//     );
//     await installDupStacks(supabase, workspaceId);

//     let workspaceUpdateEnd: Partial<WorkspaceType> = {
//       installation_status: "DONE",
//     };
//     await supabase
//       .from("workspaces")
//       .update(workspaceUpdateEnd)
//       .eq("id", workspaceId);

//     console.log(
//       "### Install done",
//       " # Time: ",
//       Math.round((performance.now() - startTime) / 1000)
//     );
//   });
// }

// export default defer(workspaceInstall);
