/**
 * Load the monorepo-root `.env` before anything reads configuration.
 * Imported first in `index.ts`. dotenv handles quoted values correctly.
 */
import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(process.cwd(), '../../.env') });
