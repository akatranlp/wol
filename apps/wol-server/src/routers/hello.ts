import { observable } from "@trpc/server/observable";
import { router, publicProcedure } from "../server/trpc";
import { v4 as UUID } from "uuid";
import z from "zod";

const clients = new Set<string>();

export const helloRouter = router({
  hello: publicProcedure.query(async ({ ctx }) => {
    console.log(ctx.req.originalUrl);
    return { hello: "world" };
  }),
  connections: publicProcedure.subscription(({ ctx: { ee } }) =>
    observable<string[]>((emit) => {
      const uuid = UUID();

      const onClientConnect = (data: string[]) => {
        emit.next(data);
      };

      ee.on("clientConnected", onClientConnect);
      clients.add(uuid);
      ee.emit("clientConnected", Array.from(clients.values()));

      return () => {
        clients.delete(uuid);
        ee.off("clientConnected", onClientConnect);
        ee.emit("clientConnected", Array.from(clients.values()));
      };
    })
  ),
});
