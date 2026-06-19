import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getDatabaseUrlCandidates() {
  if (process.env.SUPABASE_DB_URL) return [process.env.SUPABASE_DB_URL];

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = process.env.SUPABASE_PROJECT_REF ?? "buhpebhatqsxfnuvcblb";
  if (!password) return [];

  const encoded = encodeURIComponent(password);
  const regions = [
    "ap-northeast-1",
    "ap-south-1",
    "ap-southeast-1",
    "us-east-1",
    "us-west-1",
    "eu-west-1",
    "eu-central-1",
  ];
  const prefixes = ["aws-1", "aws-0"];

  const urls = [
    `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`,
  ];

  for (const prefix of prefixes) {
    for (const region of regions) {
      urls.push(
        `postgresql://postgres.${ref}:${encoded}@${prefix}-${region}.pooler.supabase.com:6543/postgres`,
      );
      urls.push(
        `postgresql://postgres.${ref}:${encoded}@${prefix}-${region}.pooler.supabase.com:5432/postgres`,
      );
    }
  }

  return urls;
}

async function connectClient() {
  const candidates = getDatabaseUrlCandidates();
  if (candidates.length === 0) return null;

  let lastError;
  for (const url of candidates) {
    const client = new pg.Client({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => undefined);
    }
  }

  throw lastError;
}

async function main() {
  loadEnvFile();

  const client = await connectClient();
  if (!client) {
    console.error(
      "Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in .env (Database password from Supabase Dashboard → Settings → Database).",
    );
    process.exit(1);
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `).catch(async () => {
    await client.query("CREATE SCHEMA IF NOT EXISTS supabase_migrations;");
    await client.query(`
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  });

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, "");
    const { rows } = await client.query(
      "SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = $1",
      [version],
    );
    if (rows.length > 0) {
      console.log(`Skip ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
    await client.query(
      "INSERT INTO supabase_migrations.schema_migrations (version) VALUES ($1)",
      [version],
    );
    console.log(`Applied ${file}`);
  }

  await client.end();
  console.log("All migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
