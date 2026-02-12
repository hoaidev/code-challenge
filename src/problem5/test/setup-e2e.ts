import * as dotenv from 'dotenv';
import { resolve } from 'path';

export default function globalSetup() {
  dotenv.config({ path: resolve(__dirname, '..', '.env') });
  process.env.APPLY_MIGRATION_STARTUP = 'false';
}
