export const createLogger = (name: string) => (...args: any) => {
    console.log(`(${new Date().toLocaleString("de-DE")})`, `[${name}]`, ...args);
  }
  