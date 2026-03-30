import 'dotenv/config';
import type { AppConfig } from '../types';

const API_TOKEN = process.env['API_TOKEN'];
const PORT = process.env['PORT'] ?? 3000;
const NODE_ENV = process.env['NODE_ENV'] ?? 'development';

if (!API_TOKEN) {
  console.error('[FATAL] API_TOKEN environment variable is required');
  process.exit(1);
}

const config: AppConfig = { API_TOKEN, PORT, NODE_ENV };

export default config;
