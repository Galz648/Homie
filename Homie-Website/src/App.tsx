import { useState } from "react";
import type { RawFacebookPost } from "./db/schema.ts";
import "./App.css";

function App() {
  const [posts, setPosts] = useState<RawFacebookPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/listings");
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      const data = (await response.json()) as RawFacebookPost[];
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>Hello, Homie!</h1>
      <p className="subtitle">Vite + React + Drizzle</p>
      <div className="card">
        <button type="button" onClick={loadPosts} disabled={loading}>
          {loading ? "Loading..." : "Load posts"}
        </button>
        {error && <p className="error">{error}</p>}
        {posts.length === 0 && !loading && !error && (
          <p className="empty">No raw Facebook posts yet.</p>
        )}
        <ul className="listings">
          {posts.map((post) => (
            <li key={post.id}>
              <strong>{post.title}</strong> — group {post.groupId}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default App;
