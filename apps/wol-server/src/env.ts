import { zEnv, createEnv } from "create-env";
import dotenv from "dotenv";
dotenv.config();

export const env = createEnv({
  vars: {
    PORT: zEnv.number().min(1000).max(65535),
  },
});
