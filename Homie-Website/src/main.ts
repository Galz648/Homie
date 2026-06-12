import { getBackendUrl } from "alchemy/cloudflare/bun-spa";

const messageEl = document.getElementById("message");
if (!messageEl) {
  throw new Error("Missing #message element");
}

try {
  const apiBaseUrl = getBackendUrl();
  const response = await fetch(new URL("/api/hello", apiBaseUrl));

  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  const data = (await response.json()) as { message: string };
  messageEl.textContent = data.message;
} catch (error) {
  messageEl.textContent =
    error instanceof Error ? error.message : "Failed to reach API";
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
