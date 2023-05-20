import { router, publicProcedure } from "../server/trpc";

export const helloRouter = router({
  hello: publicProcedure.query(async ({ ctx }) => {
    console.log(ctx.req.originalUrl);
    return { hello: "world" };
  }),
});
