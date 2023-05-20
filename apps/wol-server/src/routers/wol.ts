import z from "zod";
import DgramAsPromised from "dgram-as-promised";
import { publicProcedure, router } from "../server/trpc";
import { exec } from "child_process";
import EventEmitter from "events";
import { observable } from "@trpc/server/observable";

const ee = new EventEmitter();

const macSchema = z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/);
const ipSchema = z.string().regex(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/);

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
    await new Promise<string>((res, rej) =>
      exec(`ping -c 3 ${ipAddress}`, (err, stdout, stderr) => {
        if (err) return rej(err);
        if (stderr) return rej(err);
        return res(stdout);
      })
    );
    return true;
  } catch (_) {
    return false;
  }
};

const waitTillOnline = async (ipAddress: string) => {
  await delay(2000);
  for (let i = 3; i > 0; i--) {
    console.log("try ping now", i);
    if (await tryPing(ipAddress)) {
      return ee.emit("ping", { success: true });
    }
    await delay(2000);
  }
  return ee.emit("ping", { success: false });
};

type WOLResponse = {
  success: boolean;
};

ee.on("ping", (data: WOLResponse) => {
  console.log("ping", data.success);
});

export const wolRouter = router({
  startServer: publicProcedure.input(z.object({ mac: macSchema, ipAddress: ipSchema })).mutation(async ({ input }) => {
    const { mac, ipAddress } = input;

    await sendMagicPacket(mac, ipAddress);

    waitTillOnline(ipAddress);

    return { success: true };
  }),
  watchServer: publicProcedure.subscription(() =>
    observable<WOLResponse>((emit) => {
      const onPing = (data: WOLResponse) => {
        console.log("send ping");
        emit.next(data);
      };

      ee.on("ping", onPing);

      return () => {
        ee.off("ping", onPing);
      };
    })
  ),
});
