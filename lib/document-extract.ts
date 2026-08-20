import { unzipSync } from "fflate";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

const LINKEDIN_DATA_FILES = /(?:^|\/)(?:profile|positions|education|skills|projects|publications|certifications|courses|honors|languages|organizations|patents|volunteering|recommendations(?:_given|_received)?|articles|shares|comments|reactions|instant_reposts|rich_media|saved_items|votes)\.(?:csv|json|txt|md)$/i;
const MAX_LINKEDIN_ARCHIVE_TEXT_BYTES = 8 * 1024 * 1024;

function decodeXml(value: string): string {
  return value
    .replace(/<w:tab\/?\s*>|<a:tab\/?\s*>/g, "\t")
    .replace(/<w:br\/?\s*>|<a:br\/?\s*>|<\/w:p>|<\/a:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractRtfText(value: string): string {
  return value
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\tab\b/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, (match) => String.fromCharCode(Number.parseInt(match.slice(2), 16)))
    .replace(/\\u(-?\d+)\??/g, (_, code) => String.fromCharCode(Number(code) < 0 ? Number(code) + 65536 : Number(code)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractOfficeXmlText(bytes: Uint8Array, kind: "docx" | "pptx"): string {
  const archive = unzipSync(bytes);
  const decoder = new TextDecoder();
  const candidates = Object.entries(archive)
    .filter(([name]) =>
      kind === "docx"
        ? /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(name)
        : /^ppt\/slides\/slide\d+\.xml$/.test(name),
    )
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }));
  return candidates.map(([, value]) => decodeXml(decoder.decode(value))).filter(Boolean).join("\n\n");
}

function readableLinkedInFilename(name: string): string {
  return name.split("/").pop()?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") ?? "LinkedIn data";
}

export function extractLinkedInArchiveText(bytes: Uint8Array): string {
  const archive = unzipSync(bytes, {
    filter: (entry) => LINKEDIN_DATA_FILES.test(entry.name) && entry.originalSize <= MAX_LINKEDIN_ARCHIVE_TEXT_BYTES,
  });
  const decoder = new TextDecoder();
  let extractedBytes = 0;
  const sections = Object.entries(archive)
    .sort(([left], [right]) => left.localeCompare(right, undefined, { numeric: true }))
    .flatMap(([name, value]) => {
      if (!LINKEDIN_DATA_FILES.test(name) || extractedBytes >= MAX_LINKEDIN_ARCHIVE_TEXT_BYTES) return [];
      const remaining = MAX_LINKEDIN_ARCHIVE_TEXT_BYTES - extractedBytes;
      const selected = value.subarray(0, remaining);
      extractedBytes += selected.byteLength;
      const text = decoder.decode(selected).replace(/^\uFEFF/, "").trim();
      return text ? [`${readableLinkedInFilename(name).toUpperCase()}\n${text}`] : [];
    });
  if (!sections.length) throw new Error("No supported LinkedIn profile or activity files were found in this archive");
  return sections.join("\n\n");
}

export async function extractLinkedInDataText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === "zip") return extractLinkedInArchiveText(bytes);
  if (["csv", "json", "txt", "md"].includes(extension)) return new TextDecoder().decode(bytes).replace(/^\uFEFF/, "").trim();
  return extractDocumentText(new File([bytes], file.name, { type: file.type }));
}

export async function extractDocumentText(file: File): Promise<string> {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === "txt" || extension === "md") return new TextDecoder().decode(bytes).trim();
  if (extension === "rtf") return extractRtfText(new TextDecoder().decode(bytes));
  if (extension === "docx") return extractOfficeXmlText(bytes, "docx");
  if (extension === "pptx") return extractOfficeXmlText(bytes, "pptx");
  if (extension === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractPdfText(pdf, { mergePages: true });
    return (Array.isArray(result.text) ? result.text.join("\n\n") : result.text).trim();
  }
  throw new Error(`Unsupported document type: .${extension || "unknown"}`);
}
