import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";
import { inferAsyncReturnType, initTRPC } from "@trpc/server";
import superjson from "superjson";

export const createContext = ({ req, res }: CreateExpressContextOptions | CreateNextContextOptions) => ({ req, res });
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
