import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env if it exists
dotenv.config({ path: path.resolve(__dirname, '.env') });

const config = {
  PORT: process.env.PORT || 3001,
  HOST: process.env.HOST || '127.0.0.1',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SESSION_SECRET: process.env.SESSION_SECRET || 'fallback_dev_secret_change_me',
  DB_PATH: process.env.DB_PATH || './db/mastery.db',
  CONTENT_PATH: process.env.CONTENT_PATH || './content',
  PYTHON_PATH: process.env.PYTHON_PATH || 'python3',
  CHALLENGE_TIMEOUT_MS: parseInt(process.env.CHALLENGE_TIMEOUT_MS || '15000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};

// Resolve paths relative to process.cwd() to support running from project root
config.CONTENT_PATH = path.isAbsolute(config.CONTENT_PATH) 
  ? config.CONTENT_PATH 
  : path.resolve(process.cwd(), config.CONTENT_PATH);

// Create DB directory if it doesn't exist
const fullDbPath = path.isAbsolute(config.DB_PATH) ? config.DB_PATH : path.resolve(process.cwd(), config.DB_PATH);
fs.mkdirSync(path.dirname(fullDbPath), { recursive: true });
config.DB_PATH = fullDbPath;

export default config;
