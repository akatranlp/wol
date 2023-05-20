import { zEnv, createEnv } from "create-env";
import dotenv from "dotenv";
dotenv.config();

export const env = createEnv({
  vars: {
    SERVER_HOSTNAME: zEnv
      .string()
      .regex(/^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9])$/g),
    SERVER_PORT: zEnv.number().min(1000).max(65535),
  },
});
