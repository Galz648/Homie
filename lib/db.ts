import "dotenv/config";
import { createDb } from "../Homie-Website/src/db/index.ts";

export const db = createDb(process.env.DATABASE_URL!);
