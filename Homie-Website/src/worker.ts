import { eq } from "drizzle-orm";
import { createDb, apartmentPosts } from "./db/index.ts";
import type { worker } from "../alchemy.run.ts";

type WorkerEnv = typeof worker.Env;

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const headers = corsHeaders(request);

    if (url.pathname === "/api/hello") {
      return Response.json({ message: "Hello from Homie API!" }, { headers });
    }

    if (url.pathname === "/api/listings" && request.method === "GET") {
      try {
        const db = createDb(env.DATABASE_URL);
        const listings = await db
          .select()
          .from(apartmentPosts)
          .where(eq(apartmentPosts.status, "active"));

        return Response.json(listings, { headers });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.cause instanceof Error
              ? `${error.message}: ${error.cause.message}`
              : error.message
            : "Database query failed";
        return Response.json({ error: message }, { status: 500, headers });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404, headers });
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

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
