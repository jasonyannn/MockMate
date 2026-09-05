import type { ResearchSource } from "./types.ts";

export type PublicInterviewSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  purpose: "skills" | "labour-market" | "governance";
  licence: string;
  licenceUrl?: string;
  attribution?: string;
  status: "licensed-data" | "reference-only";
  caveat: string;
};

export const PUBLIC_INTERVIEW_DATA_VERSION = "au-public-grounding-v1.0";

export const publicInterviewSources: PublicInterviewSource[] = [
  {
    id: "jsa-nero",
    title: "Nowcast of Employment by Region and Occupation (NERO)",
    publisher: "Jobs and Skills Australia",
    url: "https://www.jobsandskills.gov.au/data/nero",
    purpose: "labour-market",
    licence: "Creative Commons Attribution 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Nowcast of Employment by Region and Occupation, Jobs and Skills Australia, Commonwealth of Australia. Used under Creative Commons BY 4.0 licence.",
    status: "licensed-data",
    caveat: "Aggregate occupation and regional estimates only. Nowcasts are modelled estimates and should not be presented as individual hiring odds.",
  },
  {
    id: "australian-skills-classification",
    title: "Australian Skills Classification — release 1.1",
    publisher: "National Skills Commission, Commonwealth of Australia",
    url: "https://www.jobsandskills.gov.au/sites/default/files/2021-12/Australian%20Skills%20Classification%20Release%201.1%20Report%20-%20September%202021.pdf",
    purpose: "skills",
    licence: "Creative Commons Attribution 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: "Australian Skills Classification BETA release 1.1–September 2021, National Skills Commission, Commonwealth of Australia. Used under Creative Commons BY 4.0 licence.",
    status: "licensed-data",
    caveat: "Useful as research vocabulary, but it is a legacy classification. Current role interpretation should also consult the evolving National Skills Taxonomy.",
  },
  {
    id: "jsa-occupation-profiles",
    title: "Occupation and Industry Profiles",
    publisher: "Jobs and Skills Australia",
    url: "https://www.jobsandskills.gov.au/data/occupation-and-industry-profiles",
    purpose: "labour-market",
    licence: "Reference link — verify the licence of each download before reuse",
    status: "reference-only",
    caveat: "Use to check current occupation context. MockMate does not copy a download unless that resource has an explicit reusable licence.",
  },
  {
    id: "jsa-national-skills-taxonomy",
    title: "National Skills Taxonomy",
    publisher: "Jobs and Skills Australia",
    url: "https://www.jobsandskills.gov.au/data/national-skills-taxonomy",
    purpose: "skills",
    licence: "Reference link — no bulk ingestion",
    status: "reference-only",
    caveat: "An evolving framework used to keep role and skills language current; referenced without copying protected material.",
  },
  {
    id: "oaic-ai-privacy",
    title: "Privacy and commercially available AI products",
    publisher: "Office of the Australian Information Commissioner",
    url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products",
    purpose: "governance",
    licence: "Government guidance — reference only",
    status: "reference-only",
    caveat: "Used to shape privacy, transparency and human-oversight questions; it is not candidate data or legal advice.",
  },
  {
    id: "industry-ai-guardrails",
    title: "Guidance for AI Adoption — 10 guardrails",
    publisher: "Australian Government Department of Industry, Science and Resources",
    url: "https://www.industry.gov.au/publications/voluntary-ai-safety-standard/10-guardrails",
    purpose: "governance",
    licence: "Government guidance — reference only",
    status: "reference-only",
    caveat: "Used to teach governance, risk management, testing, provenance and human oversight—not to make automated employment decisions.",
  },
];

const byId = new Map(publicInterviewSources.map((source) => [source.id, source]));

export function publicQuestionSources(...ids: string[]): ResearchSource[] {
  return ids.flatMap((id) => {
    const source = byId.get(id);
    return source ? [{ title: source.title, url: source.url }] : [];
  });
}

export function isApprovedAustralianPublicSource(value: string): boolean {
  try {
    const candidate = new URL(value);
    return candidate.protocol === "https:" && publicInterviewSources.some((source) => {
      const approved = new URL(source.url);
      return candidate.hostname === approved.hostname && candidate.pathname.startsWith(approved.pathname);
    });
  } catch {
    return false;
  }
}
