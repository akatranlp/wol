import { router } from "./trpc";
import { helloRouter } from "../routers/hello";
import { wolRouter } from "../routers/wol";
export const appRouter = router({
  hello: helloRouter,
  wol: wolRouter,
});

export type AppRouter = typeof appRouter;
