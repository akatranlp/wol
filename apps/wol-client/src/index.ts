import { createTRPCProxyClient, httpBatchLink, createWSClient, wsLink, splitLink } from "@trpc/client";
import type { AppRouter } from "wol-server";
import superjson from "superjson";
import { env } from "./env";
import ws from "ws";

globalThis.WebSocket = ws as any;

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

const main = async () => {
  const test = await trpc.hello.hello.query();
  console.log(test);
  await new Promise<void>(async (res) => {
    const subscription = trpc.wol.watchServer.subscribe(undefined, {
      onData({ success }) {
        console.log(success);
        subscription.unsubscribe();
        res();
      },
      onError(err) {
        console.error("error", err);
      },
    });

    const test2 = await trpc.wol.startServer.mutate({ ipAddress: "192.168.42.89", mac: "74-56-3C-66-44-8E" });
    console.log(test2);
  });

  wsClient.close();
};

main();
