import { createTRPCReact, createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { Observable } from "@trpc/server/observable";
import superjson from "superjson";
import type { AppRouter } from "../../../wol-server/src/index";
import { z } from "zod";

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type UnwrapObservable<T extends Observable<any, unknown>> = T extends Observable<infer U, unknown> ? U : never;

export const trpc = createTRPCReact<AppRouter>();

const apiConnectionSchema = z.object({
  hostname: z.string(),
  port: z.number().min(1000).max(65535),
});

type APIConnection = z.infer<typeof apiConnectionSchema>;

let jsonValue = localStorage.getItem("apiConnection")!;
if (!jsonValue) {
  const apiConnection = JSON.stringify({
    hostname: "localhost",
    port: 3000,
  });
  localStorage.setItem("apiConnection", apiConnection);
  jsonValue = apiConnection;
}

let env: APIConnection;
try {
  env = apiConnectionSchema.parse(JSON.parse(jsonValue));
} catch (_) {
  env = {
    hostname: "localhost",
    port: 3000,
  };
  localStorage.setItem("apiConnection", JSON.stringify(env));
}

const wsClient = createWSClient({
  url: `ws://${env.hostname}:${env.port}`,
});

void httpBatchLink;
void splitLink;

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    wsLink({
      client: wsClient!,
    }),

    // split link is not needed, all commands would be sent over the websocket connection
    /* splitLink({
      condition(op) {
        return op.type === "subscription";
      },
      true: wsLink({
        client: wsClient!,
      }),
      false: httpBatchLink({
        url: `http://${env.hostname}:${env.port}/trpc`,
      }),
    }), */
  ],
});
