import { env as cloudflareEnv } from "cloudflare:workers";

type RuntimeEnv = {
  DB?: D1Database;
  DOCUMENTS?: R2Bucket;
};

export function runtimeEnv(): RuntimeEnv {
  return cloudflareEnv as unknown as RuntimeEnv;
}

export function requestUser(request: Request): { id: string; email: string | null; name: string | null } {
  const id = request.headers.get("oai-authenticated-user-id") ?? "local-preview-user";
  const email = request.headers.get("oai-authenticated-user-email");
  const encodedName = request.headers.get("oai-authenticated-user-full-name");
  const encoding = request.headers.get("oai-authenticated-user-full-name-encoding");
  let name: string | null = null;
  if (encodedName && encoding === "percent-encoded-utf-8") {
    try {
      name = decodeURIComponent(encodedName);
    } catch {
      name = null;
    }
  }
  return { id, email, name };
}

export async function ensureApiTables(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT,
      display_name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      template_id TEXT,
      title TEXT NOT NULL,
      company TEXT,
      description TEXT NOT NULL,
      active_stage INTEGER DEFAULT 1 NOT NULL,
      workspace_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS job_documents (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      job_id TEXT,
      template_id TEXT,
      kind TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      extracted_text TEXT,
      extraction_status TEXT NOT NULL,
      character_count INTEGER DEFAULT 0 NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_jobs_user_updated ON jobs(user_id, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON job_documents(job_id)"),
  ]);
}
