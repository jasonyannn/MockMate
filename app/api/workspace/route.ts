import { ensureApiTables, requestUser, runtimeEnv } from "@/lib/db-runtime";
import type { Workspace } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { DB } = runtimeEnv();
  if (!DB) return Response.json({ workspace: null, persistence: "unavailable" });
  await ensureApiTables(DB);
  const user = requestUser(request);
  const row = await DB.prepare(
    "SELECT workspace_json FROM jobs WHERE user_id = ? AND workspace_json IS NOT NULL ORDER BY updated_at DESC LIMIT 1",
  )
    .bind(user.id)
    .first<{ workspace_json: string }>();
  if (!row?.workspace_json) return Response.json({ workspace: null, persistence: "d1" });
  try {
    return Response.json({ workspace: JSON.parse(row.workspace_json), persistence: "d1" });
  } catch {
    return Response.json({ workspace: null, persistence: "d1", recovered: true });
  }
}

export async function PUT(request: Request): Promise<Response> {
  const { DB } = runtimeEnv();
  if (!DB) return Response.json({ error: "Persistence is unavailable" }, { status: 503 });
  await ensureApiTables(DB);
  const user = requestUser(request);
  const workspace = (await request.json()) as Workspace;
  if (workspace?.version !== 1 || !Array.isArray(workspace.jobs) || !workspace.activeJobId) {
    return Response.json({ error: "Invalid workspace payload" }, { status: 400 });
  }
  const activeJob = workspace.jobs.find((job) => job.id === workspace.activeJobId) ?? workspace.jobs[0];
  if (!activeJob) return Response.json({ error: "A workspace needs at least one job" }, { status: 400 });
  const now = Date.now();
  await DB.batch([
    DB.prepare(`INSERT INTO users (id, email, display_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, updated_at = excluded.updated_at`)
      .bind(user.id, user.email, user.name, now, now),
    DB.prepare(`INSERT INTO jobs (id, user_id, template_id, title, company, description, active_stage, workspace_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET template_id = excluded.template_id, title = excluded.title, company = excluded.company,
      description = excluded.description, active_stage = excluded.active_stage, workspace_json = excluded.workspace_json, updated_at = excluded.updated_at`)
      .bind(
        activeJob.id,
        user.id,
        activeJob.templateId,
        activeJob.title || "Untitled role",
        activeJob.company,
        activeJob.description,
        activeJob.activeStage,
        JSON.stringify(workspace),
        Date.parse(activeJob.createdAt) || now,
        now,
      ),
  ]);
  return Response.json({ saved: true, savedAt: new Date(now).toISOString() });
}
