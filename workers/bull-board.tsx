import { similaritiesBatchEvalQueue } from "@/lib/queues/similarities-batch-eval";
import { workspaceInstallQueue } from "@/lib/queues/workspace-install";

const express = require("express");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const someQueue = similaritiesBatchEvalQueue(); // if you have a special connection to redis.
const someOtherQueue = workspaceInstallQueue();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(someQueue), new BullAdapter(someOtherQueue)],
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/admin/queues", serverAdapter.getRouter());

// other configurations of your server

app.listen(3005, () => {
  console.log("Running on 3005...");
  console.log("For the UI, open http://localhost:3005/admin/queues");
  console.log("Make sure Redis is running on port 6379 by default");
});
