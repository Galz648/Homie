import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callApi = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/hello");
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const data = (await response.json()) as { message: string };
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>Hello, Homie!</h1>
      <p className="subtitle">Vite + React + Alchemy</p>
      <div className="card">
        <button type="button" onClick={callApi} disabled={loading}>
          {loading ? "Loading..." : "Call API"}
        </button>
        {message && <p className="api-response">{message}</p>}
      </div>
    </main>
  );
}

export default App;
