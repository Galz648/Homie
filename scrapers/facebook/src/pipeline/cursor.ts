import postgres from "postgres";
import type { CursorRow } from "./types.js";

const SOURCE = "facebook_group";

export function createSql(databaseUrl?: string) {
  const url =
    databaseUrl ??
    process.env.DATABASE_URL ??
    "postgresql://homie:homie@127.0.0.1:54329/homie";
  return postgres(url, { max: 3 });
}

export type Sql = ReturnType<typeof createSql>;

export async function loadCursor(
  sql: Sql,
  groupId: string,
): Promise<CursorRow | null> {
  const rows = await sql<
    {
      groupId: string;
      groupUrl: string;
      lastPostId: string | null;
      lastPostedAt: Date | null;
      lastStatus: string;
    }[]
  >`
    SELECT
      "groupId",
      "groupUrl",
      "lastPostId",
      "lastPostedAt",
      "lastStatus"::text AS "lastStatus"
    FROM scrape_cursors
    WHERE source = ${SOURCE} AND "groupId" = ${groupId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function ensureCursor(
  sql: Sql,
  groupId: string,
  groupUrl: string,
): Promise<CursorRow> {
  const existing = await loadCursor(sql, groupId);
  if (existing) return existing;

  await sql`
    INSERT INTO scrape_cursors (source, "groupId", "groupUrl", "lastStatus")
    VALUES (${SOURCE}, ${groupId}, ${groupUrl}, 'never')
    ON CONFLICT (source, "groupId") DO NOTHING
  `;
  const row = await loadCursor(sql, groupId);
  if (!row) {
    throw new Error(`Failed to create scrape_cursors for ${groupId}`);
  }
  return row;
}

export async function markRunOutcome(
  sql: Sql,
  input: {
    groupId: string;
    groupUrl: string;
    status: string;
    error?: string | null;
    postsSeen: number;
    postsNew: number;
    lastPostId?: string | null;
    lastPostedAt?: Date | null;
    advanceWatermark: boolean;
  },
): Promise<void> {
  await ensureCursor(sql, input.groupId, input.groupUrl);

  if (input.advanceWatermark && input.lastPostId) {
    await sql`
      UPDATE scrape_cursors SET
        "lastPostId" = ${input.lastPostId},
        "lastPostedAt" = ${input.lastPostedAt ?? null},
        "lastRunAt" = now(),
        "lastStatus" = ${input.status}::"ScrapeCursorStatus",
        "lastError" = ${input.error ?? null},
        "postsSeen" = ${input.postsSeen},
        "postsNew" = ${input.postsNew},
        "updatedAt" = now()
      WHERE source = ${SOURCE} AND "groupId" = ${input.groupId}
    `;
    return;
  }

  await sql`
    UPDATE scrape_cursors SET
      "lastRunAt" = now(),
      "lastStatus" = ${input.status}::"ScrapeCursorStatus",
      "lastError" = ${input.error ?? null},
      "postsSeen" = ${input.postsSeen},
      "postsNew" = ${input.postsNew},
      "updatedAt" = now()
    WHERE source = ${SOURCE} AND "groupId" = ${input.groupId}
  `;
}
