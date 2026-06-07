import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as schema from './db/schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const db = drizzle(process.env.DB_FILE_NAME!, {
    schema: schema,
});
export { db };