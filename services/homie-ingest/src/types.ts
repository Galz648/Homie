/** Body for POST /ingest/listings */
export type ListingIngestBody = {
  postId: string;
  price?: number | null;
  currency?: string | null;
  entryDate?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  conditionals?: string | null;
  /**
   * Test-only convenience for `createMemoryStore`. The Agent/HTTP caller is not
   * the source of truth for images — `createDrizzleStore` always ignores this
   * field and copies `images` from `raw_facebook_posts` by `postId` instead.
   */
  images?: string[];
};

export type UpsertResult = {
  postId: string;
  created: boolean;
  /** Copied from raw_facebook_posts.images by postId (never client-supplied in prod). */
  images: string[];
  /** raw_facebook_posts.url for the same postId, when available. */
  postUrl?: string;
};

export type ListingStore = {
  upsert(listing: ListingIngestBody): Promise<UpsertResult>;
};

export type SlackNotifier = {
  notifyListingUpsert(listing: ListingIngestBody & UpsertResult): Promise<void>;
};

/** Posts to #homie-runtime-errors (or lane staging channel) — never fails the request. */
export type RuntimeErrorAlerter = {
  alert(input: {
    component: string;
    code: "dependency_failed" | "unhandled";
    summary: string;
    evidence?: string[];
  }): Promise<void>;
};
