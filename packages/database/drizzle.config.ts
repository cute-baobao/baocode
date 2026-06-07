import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit"
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
    out:"./drizzle",
    schema:"./src/db/schema.ts",
    dialect:"sqlite",
    dbCredentials: {
        url: process.env.DB_FILE_NAME!
    }
})