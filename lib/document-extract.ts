import { unzipSync } from "fflate";
import { extractText as extractPdfText, getDocumentProxy } from "unpdf";

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
