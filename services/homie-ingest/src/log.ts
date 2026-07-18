/** Structured stderr for Alloy → Loki (searchable JSON lines). */
export type HomieIngestLogEvent = {
  level: "error";
  service: "homie-ingest";
  component: string;
  code: "dependency_failed" | "unhandled";
  message: string;
  postId?: string;
  env?: string;
};

export function logIngestError(event: HomieIngestLogEvent): void {
  console.error(JSON.stringify(event));
}
