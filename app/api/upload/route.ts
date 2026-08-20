import { ensureApiTables, requestUser, runtimeEnv } from "@/lib/db-runtime";
import { extractDocumentText } from "@/lib/document-extract";
import type { DocumentRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "rtf", "pptx"]);
const MAX_FILE_BYTES = 12 * 1024 * 1024;

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
}

export async function POST(request: Request): Promise<Response> {
  const { DB, DOCUMENTS } = runtimeEnv();
  if (!DB || !DOCUMENTS) return Response.json({ error: "Document storage is unavailable" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "cover-letter" ? "cover-letter" : "resume";
  const jobId = typeof form.get("jobId") === "string" ? String(form.get("jobId")) : null;
  if (!(file instanceof File)) return Response.json({ error: "Choose a document to upload" }, { status: 400 });
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (!ALLOWED_EXTENSIONS.has(extension)) return Response.json({ error: "Use PDF, DOCX, TXT, MD, RTF, or PPTX" }, { status: 415 });
  if (file.size > MAX_FILE_BYTES) return Response.json({ error: "Files must be 12 MB or smaller" }, { status: 413 });

  const user = requestUser(request);
  const documentId = crypto.randomUUID();
  const storageKey = `${user.id}/${documentId}-${safeFilename(file.name)}`;
  const bytes = await file.arrayBuffer();
  let extractedText = "";
  let status: DocumentRecord["status"] = "extracted";
  try {
    extractedText = await extractDocumentText(new File([bytes], file.name, { type: file.type }));
    if (!extractedText) status = "stored";
  } catch (error) {
    status = "stored";
    extractedText = "";
    console.warn("Document extraction failed; original retained", error);
  }
  await DOCUMENTS.put(storageKey, bytes, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
    customMetadata: { userId: user.id, kind, originalFilename: file.name },
  });
  await ensureApiTables(DB);
  await DB.prepare(`INSERT INTO job_documents
    (id, user_id, job_id, template_id, kind, filename, content_type, storage_key, extracted_text, extraction_status, character_count, created_at)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(documentId, user.id, jobId, kind, file.name, file.type || "application/octet-stream", storageKey, extractedText, status, extractedText.length, Date.now())
    .run();
  const document: DocumentRecord = {
    id: documentId,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    storageKey,
    extractedText,
    characterCount: extractedText.length,
    status,
  };
  return Response.json({ document });
}
