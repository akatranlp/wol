import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { trpc } from "./utils/trpc";
import type { RouterOutput, UnwrapObservable } from "./utils/trpc";
import { v4 as UUID } from "uuid";
import { useLocalStorage } from "./hooks/useStorage";

const uuid = UUID();
type WebSocketData = UnwrapObservable<RouterOutput["wol"]["watchServer"]>;
type WebsocketClients = UnwrapObservable<RouterOutput["hello"]["connections"]>;

type StateType =
  | {
      fetched: false;
      isLoading: false;
    }
  | {
      fetched: true;
      isLoading: true;
    }
  | {
      fetched: true;
      isLoading: false;
      data: WebSocketData;
    };

type ComputerInfo = {
  name: string;
  ipAddress: string;
  mac: string;
};

function App() {
  const [fetchData, setFetchData] = useState<Record<string, StateType>>({});
  const [client, setClients] = useState<WebsocketClients>([]);

  const { data } = trpc.hello.hello.useQuery();

  trpc.hello.connections.useSubscription(undefined, {
    onData(data) {
      setClients(data);
    },
  });

  const [computers, setComputers] = useLocalStorage<ComputerInfo[]>("computers", []);

  trpc.wol.watchServer.useSubscription(
    { uuid },
    {
      onData(data) {
        console.log("websocket has answered", data);
        const computer = computers!.find((e) => e.ipAddress === data.ipAddress && e.mac === data.mac);
        if (!computer) return;
        setFetchData((prev) => ({
          ...prev,
          [computer.name]: {
            fetched: true,
            isLoading: false,
            data,
          },
        }));
      },
      onError(_) {},
    }
  );

  const { mutate } = trpc.wol.startServer.useMutation();

  const startServer = (ipAddress: string, mac: string, name: string) => () => {
    mutate({ ipAddress, mac, uuid });
    setFetchData((prev) => ({ ...prev, [name]: { fetched: true, isLoading: true } }));
  };

  return (
    <div className="min-h-screen min-w-full flex flex-col bg-[#242424]">
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div>
        <p>There are currently {client.length} client(s) connected to the server</p>
        <button onClick={() => setComputers([{ ipAddress: "192.168.20.10", mac: "D4-5D-64-D4-30-09", name: "Fabian-PC" }])}>Add Server</button>
      </div>
      <div>
        {computers &&
          computers.map(({ name, ipAddress, mac }) => (
            <div key={name}>
              <div>
                <p>{name}</p>
                <p>
                  <span>{ipAddress}</span>
                  <span>{mac}</span>
                </p>
              </div>
              <div>
                <button
                  disabled={fetchData[name] && fetchData[name].fetched && fetchData[name].isLoading}
                  onClick={startServer(ipAddress, mac, name)}
                >
                  Start
                </button>
                <button
                  onClick={() => {
                    setComputers((prev) => prev?.filter((e) => e.name !== name));
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
