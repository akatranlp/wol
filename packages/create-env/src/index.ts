import z, { type ZodError, type ZodObject, type ZodType } from "zod";

type ProxyType = "boolean" | "stringArray" | "numberArray";
type ProxyObj = { type?: ProxyType };
type ZodTypeWithProxy = ZodType & ProxyObj;

type Simplify<T> = {
  [P in keyof T]: T[P];
} & {};

export interface BaseOptions<TEnv extends Record<string, ZodType>> {
  runtimeEnv?: Record<string, string | undefined>;
  vars: TEnv;
  onValidationError?: (error: ZodError) => never;
  skipValidation?: boolean;
}

const zEnvHandler = <TZod extends ZodType>(type: ProxyType) => ({
  get(target: TZod, prop: string | symbol) {
    if (typeof prop === "string" && prop === "type") {
      return type;
    }
    const valueOrFunction = target[prop as keyof typeof target];
    if (typeof valueOrFunction === "function") {
      return (...args: any[]) => {
        const _function = valueOrFunction.bind(target);
        const value = _function(...args);
        if (typeof value === "object") {
          return new Proxy(value, zEnvHandler(type));
        }
        return value;
      };
    }

    return valueOrFunction;
  },
});

export const zEnv = {
  string: (...args: Parameters<typeof z.string>) => z.string(...args),
  enum: (...args: Parameters<typeof z.enum>) => z.enum(...args),
  number: (...args: Parameters<typeof z.number>) => z.coerce.number(...args),
  boolean: (...args: Parameters<typeof z.boolean>) => new Proxy(z.boolean(...args), zEnvHandler("boolean")),
  stringArray: (v?: z.ZodString, params?: z.RawCreateParams) => new Proxy(z.array(v ?? z.string(), params), zEnvHandler("stringArray")),
  numberArray: (v?: z.ZodNumber, params?: z.RawCreateParams) => new Proxy(z.array(v ?? z.number(), params), zEnvHandler("numberArray")),
};

const booleanValidator = (v: ZodType) =>
  z
    .string()
    .optional()
    .refine((val) => ["false", "False", "FALSE", "0", "true", "True", "TRUE", "1", undefined].includes(val))
    .transform((val) => (val == undefined ? undefined : ["true", "True", "TRUE", "1"].includes(val)))
    .pipe(v);

const stringArrayValidator = (v: ZodType) =>
  z
    .string()
    .optional()
    .transform((val) => (val == undefined || val === "" ? undefined : val.split(",").map((e) => e.trim())))
    .pipe(v);

const numberArrayValidator = (v: ZodType) =>
  z
    .string()
    .optional()
    .transform((val) => (val == undefined || val === "" ? undefined : val.split(",").map((e) => parseInt(e.trim(), 10))))
    .pipe(v);

export function createEnv<TEnv extends Record<string, ZodTypeWithProxy>>(opts: BaseOptions<TEnv>): z.infer<ZodObject<TEnv>> {
  const runtimeEnv = opts.runtimeEnv ?? process.env;

  const skip =
    opts.skipValidation ?? (!!runtimeEnv.SKIP_ENV_VALIDATION && runtimeEnv.SKIP_ENV_VALIDATION !== "false" && runtimeEnv.SKIP_ENV_VALIDATION !== "0");

  if (skip) return runtimeEnv as any;

  const onValidationError =
    opts.onValidationError ??
    ((error) => {
      console.error("[ENV]: Failed to parse the environment with following errors:\n ", error.flatten().fieldErrors);
      process.exit(1);
      //throw new Error("Invalid environment variables");
    });

  const vars: Record<string, ZodType> = {};
  for (const [k, v] of Object.entries(opts.vars)) {
    switch (v.type) {
      case undefined:
        vars[k] = v;
        break;
      case "boolean":
        vars[k] = booleanValidator(v);
        break;
      case "stringArray":
        vars[k] = stringArrayValidator(v);
        break;
      case "numberArray":
        vars[k] = numberArrayValidator(v);
        break;
    }
  }

  const parsed = z.object(vars).safeParse(runtimeEnv);
  if (parsed.success === false) {
    return onValidationError(parsed.error);
  }

  const env = parsed.data;

  /* new Proxy(parsed.data, {
    get(target, prop) {
      return target[prop as keyof typeof target];
    },
  }); */

  return env as any;
}
