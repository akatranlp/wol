import { env } from "./env";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { appRouter } from "./server/appRouter";
import { createContext } from "./server/trpc";
import type { AppRouter } from "./server/appRouter";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createLogger } from "log";

const log = createLogger("Main");

export { type AppRouter };

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const wsHandler = applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext,
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

wss.on("connection", (ws) => {
  log(`➕➕ Connection (${wss.clients.size})`);
  ws.once("close", () => {
    log(`➖➖ Connection (${wss.clients.size})`);
  });
});

server.listen(env.PORT, () => {
  log(`Listening on Port ${env.PORT}`);
});
server.on("error", console.error);

process.on("SIGTERM", () => {
  wsHandler.broadcastReconnectNotification();
  wss.close();
  server.close();
});
