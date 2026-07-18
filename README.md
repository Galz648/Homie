# Homie

Apartment listings from Facebook groups — scrape, store, browse.

## Flows

```mermaid
flowchart LR
  subgraph users["People"]
    Renter["Renter"]
    Ops["You / ops"]
  end

  subgraph happy["Happy paths"]
    Web["Website"]
    API["API"]
    DB[("Listings DB")]
    Scrape["Scrape job"]
    FB["Facebook groups"]
    Photos["Photo storage"]
  end

  subgraph errors["When something breaks"]
    Alert["Slack alerts"]
  end

  %% Renter flow
  Renter -->|browse apartments| Web
  Web --> API
  API --> DB

  %% Ingest flow
  Ops -->|schedule / renew session| Scrape
  Scrape -->|fetch posts| FB
  Scrape -->|save listings| DB
  Scrape -->|save images| Photos
  Scrape -.->|new posting| Alert

  %% Error exits
  Web -.->|API / DB down| Alert
  Scrape -.->|login failed / scrape failed| Alert
  API -.->|write / read failed| Alert
```

**Two flows**

1. **Renter** — Website → API → DB (read listings).
2. **Ingest** — Scrape job → Facebook → DB + photos (optionally notify on new posts).

**Error handling** — failures funnel to Slack: login/session, scrape, API/DB, and (later) infra/CI. Session renewal is the main ops recovery path when Facebook auth dies.
