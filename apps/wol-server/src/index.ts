import { env } from "./env";
import express from "express";
import http from "http";
import { Server, WebSocketServer } from "ws";
import { appRouter } from "./server/appRouter";
import { createContext } from "./server/trpc";
import type { AppRouter } from "./server/appRouter";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
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
  console.log(`➕➕ Connection (${wss.clients.size})`);
  ws.once("close", () => {
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});

server.listen(env.PORT, () => {
  console.log(`Listening at http://localhost:${env.PORT}`);
});
server.on("error", console.error);

process.on("SIGTERM", () => {
  wsHandler.broadcastReconnectNotification();
  wss.close();
  server.close();
});
