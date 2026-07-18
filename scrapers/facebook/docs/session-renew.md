# Facebook session renew (Homie)

Reusable anytime cookies die.

## Prefer: import from Chrome (current session)

If you are already logged into Facebook in Google Chrome:

```bash
cd scrapers/facebook
bun install
bun run import-chrome-session
```

Reads cookies from Chrome **Profile 1** (or `HOMIE_CHROME_PROFILE`) via Keychain decrypt and writes Playwright `storageState`. Does not open a browser.

## Or: headed renew (your Facebook account)

```bash
cd scrapers/facebook
bun install
bunx playwright install chromium
bun run renew
```

1. A headed Chromium window opens to Facebook login.
2. Log in with **your** account (must be a member of configured groups).
3. When you leave `/login` (feed loads), state is saved automatically  
   (or press Enter in the terminal).

Default path: `~/.config/homie/facebook_state.json`  
Override: `HOMIE_FACEBOOK_STATE_PATH`

Never commit this file.

## Signal Temporal (after renew)

When a `scrapeFacebookGroup` workflow is waiting on the `cookies_renewed` signal:

```bash
bun run signal-cookies-renewed -- --workflow-id fb-group-35819517694
bun run signal-cookies-renewed -- --all-running
bun run signal-cookies-renewed -- --dry-run --workflow-id fb-group-TEST
```

## Groups

Configured in `src/groups.ts` (online e2e uses these).
