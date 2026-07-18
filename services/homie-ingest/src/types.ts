/** Body for POST /ingest/listings */
export type ListingIngestBody = {
  postId: string;
  price?: number | null;
  currency?: string | null;
  entryDate?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  conditionals?: string | null;
};

export type UpsertResult = {
  postId: string;
  created: boolean;
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
