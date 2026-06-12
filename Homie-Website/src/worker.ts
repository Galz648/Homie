import type { bunsite } from "../alchemy.run.ts";

type BunsiteEnv = typeof bunsite.Env;

export default {
  fetch(request: Request, env: BunsiteEnv): Response {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    const headers = corsHeaders(request);

    if (url.pathname === "/api/hello") {
      return Response.json(
        { message: "Hello, Homie!" },
        { headers },
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }

    return new Response(null, { status: 404 });
  },
};

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
  return {};
}
