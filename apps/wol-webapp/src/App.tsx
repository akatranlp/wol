import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { trpc } from "./utils/trpc";
import type { RouterOutput, UnwrapObservable } from "./utils/trpc";
import { v4 as UUID } from "uuid";

const uuid = UUID();
type WebSocketData = UnwrapObservable<RouterOutput["wol"]["watchServer"]>;

type StateType =
  | {
      fetched: false;
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

function App() {
  const [count, setCount] = useState(0);
  const [fetchData, setFetchData] = useState<StateType>({ fetched: false });

  trpc.wol.watchServer.useSubscription(
    { uuid: uuid },
    {
      onData(data) {
        console.log("websocket has answered", data);
        setFetchData({
          fetched: true,
          isLoading: false,
          data,
        });
      },
      onError(err) {},
    }
  );

  const { isLoading, mutate } = trpc.wol.startServer.useMutation();

  const startServer = () => {
    mutate({ ipAddress: "192.168.20.10", mac: "D4-5D-64-D4-30-09", uuid });
    setFetchData({ fetched: true, isLoading: true });
  };

  if (isLoading) return <div>Loading...</div>;
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        <button disabled={fetchData.fetched && fetchData.isLoading} onClick={startServer}>
          Start Server
        </button>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  );
}

export default App;
