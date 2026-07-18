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
