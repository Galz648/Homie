/**
 * Manual one-image Spaces smoke.
 *
 *   source ~/.config/homie/spaces.env   # or export HOMIE_* vars
 *   cd scrapers/facebook && bun run smoke:spaces-upload
 *
 * Uploads fixtures/smoke-pixel.png and prints the public URL.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { homedir } from "node:os";
import {
  createSpacesS3Client,
  loadSpacesImageConfig,
  uploadImageToSpaces,
} from "../src/pipeline/images.js";

const FB = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: join(homedir(), ".config", "homie", "spaces.env"), override: false });
loadDotenv({ path: join(homedir(), ".config", "homie", "slack.env"), override: false });

async function main(): Promise<void> {
  process.env.HOMIE_IMAGE_UPLOAD_MODE = "spaces";
  const cfg = loadSpacesImageConfig();
  const client = createSpacesS3Client(cfg);
  const fixture = join(FB, "..", "fixtures", "smoke-pixel.png");
  const body = new Uint8Array(readFileSync(fixture));
  const url = await uploadImageToSpaces(cfg, client, {
    sourceUrl: fixture,
    body,
    contentType: "image/png",
  });
  console.log(`ok: uploaded smoke pixel → ${url}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
