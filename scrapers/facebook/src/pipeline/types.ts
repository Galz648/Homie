/** Shared scrape pipeline types (W6a single-run contract). */

export type StopReason =
  | "hit_post_cap"
  | "hit_watermark"
  | "cold_start_cap"
  | "scroll_exhausted"
  | "timeout"
  | "auth"
  | "empty_suspect"
  | "ok";

export type ScrapedPost = {
  postId: string;
  url: string;
  text: string;
  author?: string;
  postedAt?: Date;
};

export type CursorRow = {
  groupId: string;
  groupUrl: string;
  lastPostId: string | null;
  lastPostedAt: Date | null;
  lastStatus: string;
};

export type RunReport = {
  groupId: string;
  status: "ok" | "auth" | "empty_suspect" | "parse" | "throttle" | "crash";
  stopReason: StopReason;
  postsSeen: number;
  postsNew: number;
  postsUpserted: number;
  possibleGap?: boolean;
  error?: string;
  coldStart: boolean;
  /** Readable Israel time when the run finished (report-only; DB stays UTC). */
  finishedAtIsrael?: string;
};
