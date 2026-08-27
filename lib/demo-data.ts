import { analyseCandidate } from "./ai-service";
import type { Job, Workspace } from "./types";

export const SAMPLE_JOB_DESCRIPTION = `Senior Product Manager — AI Platform

We are looking for a Senior Product Manager to lead the strategy and delivery of our AI-assisted customer operations platform. You will define the product vision and roadmap, partner closely with engineering, design and go-to-market teams, and turn complex customer problems into clear, measurable outcomes.

What you will do
• Lead customer discovery and translate insight into product strategy.
• Define success metrics, evaluate experiments and make data-informed prioritisation decisions.
• Work cross-functionally with engineering, design, data science, sales and customer success.
• Communicate roadmap trade-offs and platform strategy to executive stakeholders.
• Launch AI and machine-learning capabilities responsibly, balancing quality, speed and risk.

What we are looking for
• 7+ years in product management with experience shipping B2B software products.
• Demonstrated AI or machine-learning product experience and strong technical fluency.
• Evidence of customer-led discovery, go-to-market execution and measurable commercial impact.
• Excellent leadership, stakeholder influence and written communication skills.`;

export const SAMPLE_RESUME = `Maya Chen — Senior Product Leader

SUMMARY
Product leader with 10 years of experience building B2B SaaS and AI-assisted workflow products. Combines customer discovery, technical fluency and commercial judgement to turn ambiguous problems into measurable outcomes.

NORTHSTAR SOFTWARE — Group Product Manager, 2021–Present
• Led a cross-functional group of 18 across product, engineering, design and data science to launch an AI-assisted customer support platform used by 140 enterprise teams.
• Conducted discovery with 46 customers and reframed the roadmap around resolution quality, increasing weekly active use by 31% in two quarters.
• Owned product strategy and executive roadmap communication; reduced time-to-decision by 22% through a shared evidence and prioritisation cadence.
• Partnered with sales and customer success on go-to-market, contributing $4.2M in expansion revenue in the first year.
• Established responsible AI evaluation covering accuracy, fallback behaviour and human review; improved answer acceptance from 68% to 87%.

CANOPY CLOUD — Senior Product Manager, 2017–2021
• Shipped workflow automation and analytics capabilities for operations teams, lifting retention by 14%.
• Built a customer advisory programme and quarterly product narrative used across product, marketing and sales.

SKILLS
Product strategy, customer discovery, AI/ML products, analytics, experimentation, B2B SaaS, APIs, stakeholder leadership, go-to-market, executive communication.`;

function nowMinus(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function createBlankJob(): Job {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    company: "",
    description: "",
    resume: null,
    resumeLibraryId: null,
    coverLetterDocument: null,
    coverLetterText: "",
    coverLetterLibraryId: null,
    portfolioUrl: "",
    linkedinUrl: "",
    linkedinProfileText: "",
    linkedinDocuments: [],
    templateId: null,
    activeStage: 1,
    analysis: null,
    analysisHistory: [],
    interviewQuestions: [],
    interviewAnswers: {},
    quizAttempts: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createBlankWorkspace(): Workspace {
  const job = createBlankJob();
  return {
    version: 1,
    activeJobId: job.id,
    jobs: [job],
    templates: [],
    resumeLibrary: [],
    coverLetterLibrary: [],
    evidenceItems: [],
  };
}

export function createDemoWorkspace(): Workspace {
  const baseJob: Job = {
    id: "job-ai-product",
    title: "Senior Product Manager, AI",
    company: "Lumon Labs",
    description: SAMPLE_JOB_DESCRIPTION,
    resume: {
      id: "demo-resume",
      filename: "Maya_Chen_Product_Resume.pdf",
      contentType: "application/pdf",
      storageKey: "demo/maya-chen-resume.pdf",
      extractedText: SAMPLE_RESUME,
      characterCount: SAMPLE_RESUME.length,
      status: "extracted",
    },
    resumeLibraryId: "resume-product-ai",
    coverLetterDocument: null,
    coverLetterText: "I am excited by Lumon Labs' ambition to make AI-assisted work more useful, measurable and trustworthy. My background leading AI workflow products, customer discovery and cross-functional delivery closely matches the role's priorities.",
    coverLetterLibraryId: "cover-ai-platform",
    portfolioUrl: "https://mayachen.product/portfolio",
    linkedinUrl: "https://www.linkedin.com/in/maya-chen-product",
    linkedinProfileText: "",
    linkedinDocuments: [],
    templateId: "template-product",
    activeStage: 1,
    analysis: null,
    analysisHistory: [
      { score: 68, at: nowMinus(21) },
      { score: 74, at: nowMinus(13) },
      { score: 79, at: nowMinus(6) },
    ],
    interviewQuestions: [],
    interviewAnswers: {},
    quizAttempts: [
      { id: "quiz-1", score: 70, correct: 7, total: 10, createdAt: nowMinus(9) },
      { id: "quiz-2", score: 80, correct: 8, total: 10, createdAt: nowMinus(3) },
    ],
    createdAt: nowMinus(24),
    updatedAt: new Date().toISOString(),
  };
  baseJob.analysis = analyseCandidate(baseJob);
  baseJob.analysisHistory.push({ score: baseJob.analysis.alignmentScore, at: baseJob.analysis.createdAt });
  return {
    version: 1,
    activeJobId: baseJob.id,
    jobs: [baseJob],
    templates: [
      {
        id: "template-product",
        name: "Product Leader — AI & SaaS",
        resumeLibraryId: "resume-product-ai",
        coverLetterLibraryId: "cover-ai-platform",
        resume: baseJob.resume,
        coverLetterDocument: null,
        coverLetterText: baseJob.coverLetterText,
        portfolioUrl: baseJob.portfolioUrl,
        linkedinUrl: baseJob.linkedinUrl,
        updatedAt: nowMinus(2),
      },
    ],
    resumeLibrary: [
      {
        id: "resume-product-ai",
        name: "Product leadership — AI & SaaS",
        document: baseJob.resume!,
        updatedAt: nowMinus(2),
      },
    ],
    coverLetterLibrary: [
      {
        id: "cover-ai-platform",
        name: "AI platform — adaptable opener",
        document: null,
        text: baseJob.coverLetterText,
        updatedAt: nowMinus(2),
      },
    ],
    evidenceItems: [
      {
        id: "evidence-adoption",
        title: "AI product adoption",
        description: "Reframed the platform roadmap after 46 customer interviews and launched the highest-confidence workflows.",
        metric: "+31% weekly active use",
        sourceJobId: baseJob.id,
        source: "Maya_Chen_Product_Resume.pdf",
        tags: ["AI", "Customer discovery", "Growth"],
        createdAt: nowMinus(14),
      },
      {
        id: "evidence-revenue",
        title: "Enterprise expansion",
        description: "Partnered with sales and customer success on positioning, launch readiness and adoption plays.",
        metric: "$4.2M expansion revenue",
        sourceJobId: baseJob.id,
        source: "Maya_Chen_Product_Resume.pdf",
        tags: ["GTM", "Commercial", "Leadership"],
        createdAt: nowMinus(11),
      },
      {
        id: "evidence-quality",
        title: "Responsible AI quality",
        description: "Established evaluation standards for accuracy, fallback behaviour and human review.",
        metric: "68% → 87% acceptance",
        sourceJobId: baseJob.id,
        source: "Maya_Chen_Product_Resume.pdf",
        tags: ["AI", "Quality", "Risk"],
        createdAt: nowMinus(7),
      },
    ],
  };
}
