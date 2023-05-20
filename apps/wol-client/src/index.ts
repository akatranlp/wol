import { createTRPCProxyClient, httpBatchLink, createWSClient, wsLink, splitLink } from "@trpc/client";
import type { AppRouter } from "wol-server";
import superjson from "superjson";
import { env } from "./env";
import { macSchema, ipSchema } from "utils";
import ws from "ws";
import { z } from "zod";
import { v4 as UUID } from "uuid";
import { createLogger } from "log";

const log = createLogger("WOL");

globalThis.WebSocket = ws as any;

const uuid = UUID();

const wsClient = createWSClient({
  url: `ws://${env.SERVER_HOSTNAME}:${env.SERVER_PORT}`,
});

const trpc = createTRPCProxyClient<AppRouter>({
  transformer: superjson,
  links: [
    splitLink({
      condition(op) {
        return op.type === "subscription";
      },
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: `http://${env.SERVER_HOSTNAME}:${env.SERVER_PORT}/trpc`,
      }),
    }),
  ],
});

const startServer = (ipAddress: string, mac: string) => trpc.wol.startServer.mutate({ uuid, ipAddress, mac });

const watchServerStartedResponses = () =>
  new Promise<boolean>(async (res, rej) => {
    const subscription = trpc.wol.watchServer.subscribe(
      { uuid },
      {
        onData({ success }) {
          subscription.unsubscribe();
          res(success);
        },
        onError(err) {
          rej(err);
        },
      }
    );
  });

const argParser = z.tuple([ipSchema, macSchema]);

const main = async () => {
  log("Starting Application...");
  const [ipAddress, mac] = argParser.parse(process.argv.slice(2));
  log(`Starting computer with ip: ${ipAddress} and mac: ${mac}`);

  await startServer(ipAddress, mac);
  log("Waiting for response...");
  const success = await watchServerStartedResponses();
  log(success ? "Server is started now!!!" : "Server could not be started!!!");
  wsClient.close();
};

main();
