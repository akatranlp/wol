import z from "zod";
import DgramAsPromised from "dgram-as-promised";
import { publicProcedure, router } from "../server/trpc";
import { exec } from "child_process";
import EventEmitter from "events";
import { observable } from "@trpc/server/observable";
import { macSchema, ipSchema } from "utils";
import { createLogger } from "log";

const log = createLogger("WOL");

type WOLResponse = {
  uuid: string;
  ipAddress: string;
  mac: string;
  success: boolean;
};

class MyEventEmitter extends EventEmitter {
  override on(eventname: "ping", listener: (data: WOLResponse) => void) {
    super.on(eventname, listener);
    return this;
  }

  override off(eventname: "ping", listener: (data: WOLResponse) => void) {
    super.off(eventname, listener);
    return this;
  }

  override emit(eventname: "ping", data: WOLResponse) {
    return super.emit(eventname, data);
  }
}
const ee = new MyEventEmitter();

const sendMagicPacket = async (mac: string, ipAdress: string) => {
  const packet = Buffer.from("ff".repeat(6) + mac.replaceAll(mac[2], "").repeat(16), "hex");
  const socket = DgramAsPromised.createSocket("udp4");
  const broadcast = `${ipAdress.substring(0, ipAdress.lastIndexOf("."))}.255`;

  await socket.bind();
  socket.setBroadcast(true);
  for (let i = 3; i > 0; i--) {
    await socket.send(packet, 9, broadcast);
  }
  await socket.close();
};

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const tryPing = async (ipAddress: string) => {
  try {
    await new Promise<string>((res, rej) => {
      const command = process.platform === "win32" ? "ping" : "ping -c 3";
      exec(`${command} ${ipAddress}`, (err, stdout, stderr) => {
        if (err) return rej(err);
        if (stderr) return rej(err);
        return res(stdout);
      });
    });
    return true;
  } catch (_) {
    return false;
  }
};

const waitTillOnline = async (ipAddress: string, mac: string, uuid: string) => {
  await delay(2000);
  for (let i = 3; i > 0; i--) {
    if (await tryPing(ipAddress)) {
      return ee.emit("ping", { success: true, uuid, ipAddress, mac });
    }
    await delay(2000);
  }
  return ee.emit("ping", { success: false, uuid, ipAddress, mac });
};

ee.on("ping", ({ ipAddress, mac, success }) => {
  log(`Server with ipAddress: ${ipAddress} and mac: ${mac} was ${success ? "" : "not "}started`);
});

export const wolRouter = router({
  startServer: publicProcedure.input(z.object({ mac: macSchema, ipAddress: ipSchema, uuid: z.string().uuid() })).mutation(async ({ input }) => {
    const { mac, ipAddress, uuid } = input;

    await sendMagicPacket(mac, ipAddress);

    waitTillOnline(ipAddress, mac, uuid);

    return { success: true };
  }),
  watchServer: publicProcedure.input(z.object({ uuid: z.string().uuid() })).subscription(({ input }) =>
    observable<WOLResponse>((emit) => {
      const onPing = (data: WOLResponse) => {
        if (data.uuid === input.uuid) emit.next(data);
      };

      ee.on("ping", onPing);

      return () => {
        ee.off("ping", onPing);
      };
    })
  ),
});
