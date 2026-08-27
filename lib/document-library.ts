import type { DocumentRecord, SavedCoverLetter, SavedResume, Workspace } from "./types";

export function documentDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeDocumentLibrary(source: Workspace): Workspace {
  const resumeLibrary: SavedResume[] = Array.isArray(source.resumeLibrary) ? [...source.resumeLibrary] : [];
  const coverLetterLibrary: SavedCoverLetter[] = Array.isArray(source.coverLetterLibrary) ? [...source.coverLetterLibrary] : [];

  const saveResume = (document: DocumentRecord | null, suggestedName: string): string | null => {
    if (!document) return null;
    const existing = resumeLibrary.find((item) => item.document.id === document.id);
    if (existing) return existing.id;
    const item: SavedResume = {
      id: `resume-${document.id}`,
      name: suggestedName || documentDisplayName(document.filename) || "Saved resume",
      document,
      updatedAt: new Date().toISOString(),
    };
    resumeLibrary.push(item);
    return item.id;
  };

  const saveCoverLetter = (document: DocumentRecord | null, text: string, suggestedName: string, fallbackId: string): string | null => {
    if (!document && !text.trim()) return null;
    const existing = coverLetterLibrary.find((item) => document ? item.document?.id === document.id : !item.document && item.text === text);
    if (existing) return existing.id;
    const item: SavedCoverLetter = {
      id: document ? `cover-${document.id}` : `cover-${fallbackId}`,
      name: suggestedName || (document ? documentDisplayName(document.filename) : "Saved cover letter"),
      document,
      text,
      updatedAt: new Date().toISOString(),
    };
    coverLetterLibrary.push(item);
    return item.id;
  };

  const templates = source.templates.map((template) => ({
    ...template,
    resumeLibraryId: template.resumeLibraryId && resumeLibrary.some((item) => item.id === template.resumeLibraryId)
      ? template.resumeLibraryId
      : saveResume(template.resume, `${template.name} resume`),
    coverLetterLibraryId: template.coverLetterLibraryId && coverLetterLibrary.some((item) => item.id === template.coverLetterLibraryId)
      ? template.coverLetterLibraryId
      : saveCoverLetter(template.coverLetterDocument, template.coverLetterText, `${template.name} cover letter`, template.id),
  }));

  const jobs = source.jobs.map((job) => ({
    ...job,
    linkedinDocuments: Array.isArray(job.linkedinDocuments) ? job.linkedinDocuments : [],
    resumeLibraryId: job.resumeLibraryId && resumeLibrary.some((item) => item.id === job.resumeLibraryId)
      ? job.resumeLibraryId
      : saveResume(job.resume, documentDisplayName(job.resume?.filename ?? "")),
    coverLetterLibraryId: job.coverLetterLibraryId && coverLetterLibrary.some((item) => item.id === job.coverLetterLibraryId)
      ? job.coverLetterLibraryId
      : saveCoverLetter(job.coverLetterDocument, job.coverLetterText, documentDisplayName(job.coverLetterDocument?.filename ?? ""), job.id),
  }));

  return { ...source, jobs, templates, resumeLibrary, coverLetterLibrary };
}
