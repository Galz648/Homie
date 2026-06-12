import { useState } from "react";
import type { ApartmentPost } from "./db/schema.ts";
import "./App.css";

function App() {
  const [listings, setListings] = useState<ApartmentPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/listings");
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const data = (await response.json()) as ApartmentPost[];
      setListings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>Hello, Homie!</h1>
      <p className="subtitle">Vite + React + Drizzle</p>
      <div className="card">
        <button type="button" onClick={loadListings} disabled={loading}>
          {loading ? "Loading..." : "Load listings"}
        </button>
        {error && <p className="error">{error}</p>}
        {listings.length === 0 && !loading && !error && (
          <p className="empty">No active listings yet.</p>
        )}
        <ul className="listings">
          {listings.map((listing) => (
            <li key={listing.id}>
              <strong>{listing.title}</strong> — {listing.city} · ₪{listing.rent}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default App;
