import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import superjson from "superjson";
import EventEmitter from "events";

export type WOLResponse = {
  uuid: string;
  ipAddress: string;
  mac: string;
  success: boolean;
};

export interface MyEvents {
  ping: (data: WOLResponse) => void;
  clientConnected: (data: string[]) => void;
}

declare interface MyEventEmitter {
  on<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  off<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  once<TEv extends keyof MyEvents>(event: TEv, listener: MyEvents[TEv]): this;
  emit<TEv extends keyof MyEvents>(event: TEv, ...args: Parameters<MyEvents[TEv]>): boolean;
}

class MyEventEmitter extends EventEmitter {}

export const ee = new MyEventEmitter();

ee.on("ping", ({ ipAddress, mac, success }) => {
  console.log(`Server with ipAddress: ${ipAddress} and mac: ${mac} was ${success ? "" : "not "}started`);
});

export const createContext = ({ req, res }: CreateExpressContextOptions | CreateNextContextOptions) => ({ req, res, ee });
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
