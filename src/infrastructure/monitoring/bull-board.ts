/**
 * Bull Board queue monitoring UI.
 * Exposes a web dashboard at `/admin/queues` for inspecting BullMQ job states.
 */
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import type { Express, Router } from "express";
import { getFileProcessingQueue } from "../../core/queue/queue.factory.js";
import { logger } from "../../core/logger/logger.js";

/**
 * Mounts the Bull Board UI on the Express app.
 *
 * @param app - Express application instance.
 */
export function setupBullBoard(app: Express): void {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(getFileProcessingQueue())],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter() as Router);

  logger.info("Bull Board monitoring UI available at /admin/queues");
}
