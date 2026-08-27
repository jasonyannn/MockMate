import { ensureApiTables, requestUser, runtimeEnv } from "@/lib/db-runtime";
import { extractDocumentText, extractLinkedInDataText } from "@/lib/document-extract";
import type { DocumentRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt", "md", "rtf", "pptx"]);
const LINKEDIN_EXTENSIONS = new Set(["pdf", "zip", "csv", "json", "txt", "md"]);
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_LINKEDIN_FILE_BYTES = 50 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 300_000;

type UploadKind = "resume" | "cover-letter" | "linkedin-profile" | "linkedin-activity";

function safeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-120);
}

export async function POST(request: Request): Promise<Response> {
  const user = requestUser(request);
  if (!user) return Response.json({ error: "Sign in to upload documents" }, { status: 401 });
  const { DB, DOCUMENTS } = runtimeEnv();
  if (!DB || !DOCUMENTS) return Response.json({ error: "Document storage is unavailable" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const requestedKind = String(form.get("kind") ?? "resume");
  const kind: UploadKind = requestedKind === "cover-letter" || requestedKind === "linkedin-profile" || requestedKind === "linkedin-activity" ? requestedKind : "resume";
  const isLinkedIn = kind === "linkedin-profile" || kind === "linkedin-activity";
  const jobId = typeof form.get("jobId") === "string" ? String(form.get("jobId")) : null;
  if (!(file instanceof File)) return Response.json({ error: "Choose a document to upload" }, { status: 400 });
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const allowedExtensions = isLinkedIn ? LINKEDIN_EXTENSIONS : ALLOWED_EXTENSIONS;
  const maxBytes = isLinkedIn ? MAX_LINKEDIN_FILE_BYTES : MAX_FILE_BYTES;
  if (!allowedExtensions.has(extension)) return Response.json({ error: isLinkedIn ? "Use a LinkedIn PDF, ZIP, CSV, JSON, TXT, or MD file" : "Use PDF, DOCX, TXT, MD, RTF, or PPTX" }, { status: 415 });
  if (file.size > maxBytes) return Response.json({ error: `Files must be ${isLinkedIn ? 50 : 12} MB or smaller` }, { status: 413 });

  if (jobId) {
    await ensureApiTables(DB);
    const jobOwner = await DB.prepare("SELECT user_id FROM jobs WHERE id = ?").bind(jobId).first<{ user_id: string }>();
    if (jobOwner && jobOwner.user_id !== user.id) return Response.json({ error: "You cannot attach documents to that workspace" }, { status: 403 });
  }
  const documentId = crypto.randomUUID();
  const storageKey = `${user.id}/${documentId}-${safeFilename(file.name)}`;
  const bytes = await file.arrayBuffer();
  let extractedText = "";
  let status: DocumentRecord["status"] = "extracted";
  try {
    extractedText = isLinkedIn
      ? await extractLinkedInDataText(new File([bytes], file.name, { type: file.type }))
      : await extractDocumentText(new File([bytes], file.name, { type: file.type }));
    if (isLinkedIn && extractedText.length > MAX_EXTRACTED_CHARACTERS) extractedText = extractedText.slice(0, MAX_EXTRACTED_CHARACTERS);
    if (!extractedText) {
      if (isLinkedIn) return Response.json({ error: "No readable LinkedIn profile or activity data was found in that file" }, { status: 422 });
      status = "stored";
    }
  } catch (error) {
    if (isLinkedIn) return Response.json({ error: error instanceof Error ? error.message : "Could not read that LinkedIn export" }, { status: 422 });
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

export async function DELETE(request: Request): Promise<Response> {
  const user = requestUser(request);
  if (!user) return Response.json({ error: "Sign in to remove documents" }, { status: 401 });
  const { DB, DOCUMENTS } = runtimeEnv();
  if (!DB || !DOCUMENTS) return Response.json({ error: "Document storage is unavailable" }, { status: 503 });
  const documentId = new URL(request.url).searchParams.get("documentId");
  if (!documentId) return Response.json({ error: "A document ID is required" }, { status: 400 });
  await ensureApiTables(DB);
  const row = await DB.prepare("SELECT storage_key FROM job_documents WHERE id = ? AND user_id = ?")
    .bind(documentId, user.id)
    .first<{ storage_key: string }>();
  if (!row?.storage_key) return Response.json({ error: "Document not found" }, { status: 404 });
  await DOCUMENTS.delete(row.storage_key);
  await DB.prepare("DELETE FROM job_documents WHERE id = ? AND user_id = ?").bind(documentId, user.id).run();
  return Response.json({ deleted: true });
}
