import { stableHash } from "./scoring-core.ts";
import type { Job, QuizQuestion, StudyTerm, TerminologyCategory, TerminologySheet } from "./types.ts";

export const TERMINOLOGY_CATEGORIES: TerminologyCategory[] = [
  "AI & automation",
  "Technology & data",
  "Marketing & creator economy",
  "People & HR",
  "Sales & customer success",
  "Finance & commercial",
  "Operations & strategy",
  "Product & design",
  "Legal, risk & governance",
];

type TermSeed = Omit<StudyTerm, "id">;

const TERM_SEEDS: TermSeed[] = [
  { category: "AI & automation", term: "Retrieval-augmented generation (RAG)", definition: "An AI pattern that finds relevant source material before generating an answer.", inPractice: "A support assistant retrieves approved help-centre articles, then uses them to answer the customer.", example: "“We use RAG so answers are grounded in our current policy documents.”", whyItMatters: "It explains how teams make generative AI more useful and easier to verify." },
  { category: "AI & automation", term: "Agentic workflow", definition: "A workflow where an AI can choose and complete several steps using tools within set boundaries.", inPractice: "An agent reads a ticket, checks an order, drafts a reply and routes an exception to a person.", example: "“The agent can investigate the request, but refunds still need human approval.”", whyItMatters: "Many teams now distinguish simple chat from AI that can take bounded action." },
  { category: "AI & automation", term: "Grounding", definition: "Connecting an AI response to trusted facts, documents or system data.", inPractice: "The model receives the latest product catalogue instead of relying only on its training data.", example: "“Every recommendation must be grounded in the customer record.”", whyItMatters: "Grounding reduces unsupported claims and improves confidence in business use." },
  { category: "AI & automation", term: "Hallucination", definition: "A confident-looking AI output that is unsupported, incorrect or invented.", inPractice: "A model creates a policy clause that does not exist in the company handbook.", example: "“We track hallucination risk and require citations for high-impact answers.”", whyItMatters: "You need to discuss verification, fallbacks and human review when AI can be wrong." },
  { category: "AI & automation", term: "Prompt injection", definition: "An attempt to make an AI ignore its intended rules by hiding conflicting instructions in user input or retrieved content.", inPractice: "A webpage tells a research assistant to reveal private data instead of summarising the page.", example: "“We treat retrieved content as untrusted so prompt injection cannot override system rules.”", whyItMatters: "AI features that read outside content need boundaries, validation and safe tool permissions." },

  { category: "Technology & data", term: "API", definition: "A defined way for software systems to request data or actions from each other.", inPractice: "A careers site uses an API to retrieve open roles from a recruitment platform.", example: "“The app calls the payroll API instead of storing salary data twice.”", whyItMatters: "APIs are central to integrations, automation and modern digital products." },
  { category: "Technology & data", term: "Latency", definition: "The delay between making a request and receiving the result.", inPractice: "An AI reply that takes eight seconds may feel slow even when the answer is accurate.", example: "“We reduced latency so the dashboard loads in under two seconds.”", whyItMatters: "Teams constantly balance response speed, quality and cost." },
  { category: "Technology & data", term: "Technical debt", definition: "Future work created when a short-term technical choice makes later changes harder.", inPractice: "A rushed manual workaround supports launch but needs to be rebuilt before the product scales.", example: "“We accepted limited technical debt to meet the pilot date, with a funded cleanup plan.”", whyItMatters: "It is a common way to discuss engineering trade-offs with non-technical stakeholders." },
  { category: "Technology & data", term: "ETL", definition: "Extract, transform and load: moving data from sources, cleaning it and placing it where it can be used.", inPractice: "Customer events are pulled from several tools, standardised and loaded into a warehouse.", example: "“The ETL pipeline gives marketing one consistent view of campaign performance.”", whyItMatters: "Reliable reporting and AI depend on well-prepared data." },
  { category: "Technology & data", term: "Schema", definition: "A defined structure describing how data is organised, named and validated.", inPractice: "An analytics event schema specifies which fields every checkout event must contain.", example: "“We agreed the schema before integrating the two systems.”", whyItMatters: "Shared structures prevent systems and teams from interpreting the same data differently." },

  { category: "Marketing & creator economy", term: "Hook rate", definition: "The share of viewers who keep watching after the opening moments of a video or ad.", inPractice: "A creator tests three different opening lines to see which stops more people scrolling.", example: "“The new first three seconds lifted hook rate, so we kept the rest of the edit.”", whyItMatters: "Short-form teams use it to judge whether the opening earns attention." },
  { category: "Marketing & creator economy", term: "UGC creative", definition: "Brand content designed to feel like authentic user or creator-made media rather than a polished advertisement.", inPractice: "A creator films a casual product demonstration vertically on a phone.", example: "“We paired studio assets with UGC creative to test trust against production value.”", whyItMatters: "Creator-led formats now influence paid advertising, social commerce and brand voice." },
  { category: "Marketing & creator economy", term: "Creator whitelisting", definition: "Permission for a brand to run paid advertising through a creator's social identity or handle.", inPractice: "A creator authorises a brand to promote their product video to a larger audience.", example: "“Whitelisting improved credibility, but usage rights and duration were agreed first.”", whyItMatters: "It combines media buying, creator partnerships, permissions and brand safety." },
  { category: "Marketing & creator economy", term: "Social SEO", definition: "Optimising social content so people can discover it through search inside social platforms.", inPractice: "A video says and displays the exact problem customers search for, supported by a clear caption.", example: "“We used customer search language in the title, voiceover and on-screen text.”", whyItMatters: "Younger audiences increasingly use social platforms as discovery and search tools." },
  { category: "Marketing & creator economy", term: "Creative fatigue", definition: "The decline in advertising performance that occurs when an audience sees the same creative too often.", inPractice: "A campaign's response rate falls even though targeting and the offer have not changed.", example: "“We refreshed the hook and visual treatment after frequency showed creative fatigue.”", whyItMatters: "Modern content teams need a repeatable supply of varied ideas, not one permanent winning ad." },

  { category: "People & HR", term: "Skills-based hiring", definition: "Assessing candidates against demonstrated capabilities rather than relying mainly on degrees or previous titles.", inPractice: "A hiring process uses a work sample and clear capability rubric.", example: "“We rewrote the role around skills and evidence instead of pedigree.”", whyItMatters: "It affects job design, screening, interviews and internal mobility." },
  { category: "People & HR", term: "Time to productivity", definition: "How long it takes a new employee to perform the role effectively and independently.", inPractice: "HR measures whether a redesigned onboarding plan helps new staff handle core work sooner.", example: "“The buddy programme reduced time to productivity by three weeks.”", whyItMatters: "It connects recruitment and onboarding activity to a practical business outcome." },
  { category: "People & HR", term: "eNPS", definition: "Employee Net Promoter Score: a survey measure of how likely employees are to recommend their workplace.", inPractice: "People leaders track eNPS alongside comments, retention and manager-level patterns.", example: "“eNPS improved, but we checked the written feedback before claiming success.”", whyItMatters: "It is common HR shorthand, but should not be interpreted without context." },
  { category: "People & HR", term: "Talent density", definition: "The concentration of highly capable people whose combined impact raises team performance.", inPractice: "A company invests in fewer, well-scoped roles with strong hiring and development standards.", example: "“Our goal was stronger talent density, not simply a smaller headcount.”", whyItMatters: "Leaders use it when discussing workforce quality, structure and performance expectations." },
  { category: "People & HR", term: "Employee value proposition (EVP)", definition: "The overall reasons people choose to join, stay at and contribute to an organisation.", inPractice: "HR combines meaningful work, development, reward, flexibility and culture into a credible employment promise.", example: "“Candidate research showed our EVP needed clearer proof of career progression.”", whyItMatters: "An EVP connects employer brand, recruitment, employee experience and retention." },

  { category: "Sales & customer success", term: "Ideal customer profile (ICP)", definition: "A description of the type of organisation most likely to gain value and become a strong customer.", inPractice: "Sales and marketing focus on mid-sized healthcare companies with a specific workflow problem.", example: "“We tightened the ICP before increasing lead volume.”", whyItMatters: "A clear ICP improves targeting, qualification, product choices and customer retention." },
  { category: "Sales & customer success", term: "Annual recurring revenue (ARR)", definition: "The yearly value of predictable recurring subscription revenue.", inPractice: "A monthly subscription worth $10,000 contributes roughly $120,000 in ARR.", example: "“The enterprise launch added $1.2 million in ARR.”", whyItMatters: "ARR is a core growth measure for subscription businesses." },
  { category: "Sales & customer success", term: "Sales velocity", definition: "How quickly qualified opportunities move through the pipeline and turn into revenue.", inPractice: "A team improves win rate and shortens the sales cycle for its best customer segment.", example: "“Better qualification increased sales velocity without adding more leads.”", whyItMatters: "It combines pipeline volume, deal value, win rate and time." },
  { category: "Sales & customer success", term: "Churn", definition: "The rate at which customers or recurring revenue leave during a period.", inPractice: "Customer success studies cancellations to find onboarding or product-value problems.", example: "“Logo churn fell after we redesigned implementation for small customers.”", whyItMatters: "Retention often matters as much as acquisition in recurring-revenue businesses." },
  { category: "Sales & customer success", term: "Expansion revenue", definition: "Additional recurring revenue earned from existing customers through upgrades, added usage or new products.", inPractice: "A customer adds more seats after the first team proves the product's value.", example: "“Better adoption created expansion revenue without relying on new-logo acquisition.”", whyItMatters: "It shows whether customer value grows after the initial sale." },

  { category: "Finance & commercial", term: "Unit economics", definition: "The revenue and direct costs associated with one customer, order or other business unit.", inPractice: "A delivery company compares revenue per order with fulfilment and support costs.", example: "“Growth looked healthy, but unit economics showed each new order still lost money.”", whyItMatters: "It tests whether growth can become sustainable rather than only larger." },
  { category: "Finance & commercial", term: "Gross margin", definition: "The percentage of revenue left after the direct cost of delivering the product or service.", inPractice: "A software company subtracts hosting and service-delivery costs from revenue.", example: "“Automation improved gross margin by reducing delivery effort per customer.”", whyItMatters: "It shows how efficiently the core offering creates value." },
  { category: "Finance & commercial", term: "Contribution margin", definition: "Revenue remaining after the variable costs caused by producing or selling one more unit.", inPractice: "A campaign is evaluated after media, fulfilment and payment costs, not just top-line sales.", example: "“The promotion increased revenue but reduced contribution margin.”", whyItMatters: "It helps teams judge pricing, campaigns and channel choices." },
  { category: "Finance & commercial", term: "Cash runway", definition: "The estimated time a business can keep operating before its available cash runs out.", inPractice: "A startup compares its cash balance with monthly net spending.", example: "“The revised hiring plan extended runway from nine to fourteen months.”", whyItMatters: "It shapes investment, hiring and risk decisions when cash is limited." },
  { category: "Finance & commercial", term: "Burn rate", definition: "The amount of cash a business spends beyond what it brings in during a period.", inPractice: "Finance tracks monthly cash outflow while a growing company is not yet profitable.", example: "“The team reduced burn rate without cutting the product launch.”", whyItMatters: "Burn rate links operating choices to runway and funding needs." },

  { category: "Operations & strategy", term: "Operating cadence", definition: "The repeating rhythm of meetings, decisions, reviews and planning that keeps work coordinated.", inPractice: "A team uses weekly delivery reviews and monthly outcome reviews with distinct purposes.", example: "“We simplified the operating cadence so decisions had owners and deadlines.”", whyItMatters: "A clear cadence turns strategy into regular decisions and follow-through." },
  { category: "Operations & strategy", term: "RACI", definition: "A responsibility map showing who is responsible, accountable, consulted and informed.", inPractice: "A launch plan names one accountable leader while identifying contributors and stakeholders.", example: "“The RACI stopped approval questions bouncing between three teams.”", whyItMatters: "It clarifies ownership in cross-functional work." },
  { category: "Operations & strategy", term: "Service-level agreement (SLA)", definition: "A documented commitment for the level, quality or speed of a service.", inPractice: "Support promises to respond to priority-one incidents within thirty minutes.", example: "“The vendor met uptime targets but missed the incident-response SLA.”", whyItMatters: "SLAs make service expectations measurable across customers, teams and vendors." },
  { category: "Operations & strategy", term: "Bottleneck", definition: "The step with the least capacity that limits the output of the whole process.", inPractice: "Applications wait for one manual compliance review even though every other step is fast.", example: "“Adding leads would not help until we removed the onboarding bottleneck.”", whyItMatters: "Improvement work has more impact when it targets the true constraint." },
  { category: "Operations & strategy", term: "Change management", definition: "The structured work of helping people adopt a new process, system or way of working.", inPractice: "A rollout combines stakeholder involvement, training, communication and adoption measurement.", example: "“The technology worked; change management determined whether teams actually used it.”", whyItMatters: "Business change succeeds through behaviour and support as well as delivery." },

  { category: "Product & design", term: "North-star metric", definition: "One leading measure that represents the recurring customer value a product creates.", inPractice: "A collaboration product tracks teams completing meaningful shared work each week.", example: "“Revenue mattered, but weekly completed workflows was our north-star metric.”", whyItMatters: "It aligns product decisions around value rather than disconnected activity." },
  { category: "Product & design", term: "Minimum viable product (MVP)", definition: "The smallest credible solution that can test a risky assumption with real users.", inPractice: "A team launches one complete workflow before building every planned feature.", example: "“The MVP tested willingness to change behaviour, not just whether the interface worked.”", whyItMatters: "It is a learning strategy, not a synonym for low quality." },
  { category: "Product & design", term: "Jobs to be done", definition: "A way to understand the progress a person is trying to make in a particular situation.", inPractice: "Research focuses on why someone hires a product, including functional and emotional needs.", example: "“The job was gaining confidence before a client meeting, not merely reading a dashboard.”", whyItMatters: "It helps teams frame customer needs beyond requested features." },
  { category: "Product & design", term: "Design system", definition: "Reusable design rules, components and patterns that help teams build consistent experiences.", inPractice: "Buttons, forms, spacing and accessibility behaviour are defined once and reused.", example: "“The design system reduced inconsistency and sped up delivery across three products.”", whyItMatters: "It connects brand quality, accessibility and engineering efficiency." },
  { category: "Product & design", term: "Product-market fit", definition: "The point where a product solves an important need for a market that consistently chooses and values it.", inPractice: "Teams look for strong retention, repeat use and demand that is not entirely created by promotion.", example: "“Acquisition grew, but retention showed we had not yet reached product-market fit.”", whyItMatters: "It separates temporary interest from durable customer value." },

  { category: "Legal, risk & governance", term: "Personally identifiable information (PII)", definition: "Data that can identify a person directly or when combined with other information.", inPractice: "Names, personal emails and government identifiers require appropriate handling and access controls.", example: "“We removed PII before using the records for model evaluation.”", whyItMatters: "Privacy obligations affect data collection, analytics and AI design." },
  { category: "Legal, risk & governance", term: "Data residency", definition: "The country or region where data is stored and processed.", inPractice: "A customer requires its records to remain in Australia.", example: "“Data residency was a procurement requirement for government clients.”", whyItMatters: "Location requirements can shape vendors, architecture and customer eligibility." },
  { category: "Legal, risk & governance", term: "Model governance", definition: "The controls used to approve, monitor, document and manage AI models through their lifecycle.", inPractice: "A team records intended use, evaluation results, owners, limitations and review dates.", example: "“Model governance defined who could approve a higher-risk use case.”", whyItMatters: "Responsible AI needs repeatable accountability, not only technical testing." },
  { category: "Legal, risk & governance", term: "SOC 2", definition: "An independent assurance framework used to assess controls for security and related trust principles.", inPractice: "Enterprise buyers review a vendor's SOC 2 report during security due diligence.", example: "“SOC 2 evidence shortened the customer's security review.”", whyItMatters: "It frequently appears in B2B technology procurement and risk conversations." },
  { category: "Legal, risk & governance", term: "Data processing agreement (DPA)", definition: "A contract describing how one organisation processes personal data on behalf of another.", inPractice: "A company reviews a software vendor's security duties, subprocessors and deletion terms before sharing customer data.", example: "“Legal approved the DPA before the platform received production data.”", whyItMatters: "Data-enabled partnerships need clear responsibilities beyond a general commercial contract." },
];

const CATEGORY_PATTERNS: Record<TerminologyCategory, RegExp> = {
  "AI & automation": /\bai\b|artificial intelligence|machine learning|llm|automat|agent|model/i,
  "Technology & data": /engineer|software|technical|developer|data|analytics|platform|api|cloud/i,
  "Marketing & creator economy": /market|brand|content|creator|social|campaign|media|growth|seo/i,
  "People & HR": /human resources|\bhr\b|people|talent|recruit|employee|workforce|culture/i,
  "Sales & customer success": /sales|customer success|account|revenue|pipeline|commercial|retention/i,
  "Finance & commercial": /finance|financial|accounting|margin|budget|pricing|investment|commercial/i,
  "Operations & strategy": /operations|strategy|delivery|process|programme|program|project|supply/i,
  "Product & design": /product|design|research|roadmap|discovery|experience|ux|ui/i,
  "Legal, risk & governance": /legal|risk|compliance|privacy|security|governance|policy|audit/i,
};

function termId(category: string, term: string): string {
  return `term-${stableHash(`${category}-${term}`).toString(36)}`;
}

export function recommendedTerminologyCategories(job: Pick<Job, "title" | "description">): TerminologyCategory[] {
  const source = `${job.title} ${job.description}`;
  const matched = TERMINOLOGY_CATEGORIES.filter((category) => CATEGORY_PATTERNS[category].test(source));
  const defaults: TerminologyCategory[] = ["Operations & strategy", "Product & design", "Technology & data"];
  return (matched.length ? matched : defaults).slice(0, 4);
}

export function generateStudySheet(job: Pick<Job, "title" | "description">): TerminologySheet {
  const recommended = new Set(recommendedTerminologyCategories(job));
  const terms = TERM_SEEDS.map((seed) => ({
    ...seed,
    id: termId(seed.category, seed.term),
    whyItMatters: recommended.has(seed.category) && job.title
      ? `${seed.whyItMatters} This category is especially relevant to ${job.title}.`
      : seed.whyItMatters,
  })).sort((a, b) => Number(recommended.has(b.category)) - Number(recommended.has(a.category)) || TERMINOLOGY_CATEGORIES.indexOf(a.category) - TERMINOLOGY_CATEGORIES.indexOf(b.category));
  const generatedAt = new Date().toISOString();
  return {
    terms,
    generatedAt,
    provenance: { mode: "deterministic-fallback", model: null, generatedAt, reason: "Curated MockMate business glossary" },
  };
}

export function mergeTerminologyTerms(primary: StudyTerm[], fallback: StudyTerm[]): StudyTerm[] {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter((item) => {
    const key = `${item.category}:${item.term}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function generateTerminologyQuiz(terms: StudyTerm[], count: 5 | 10 | 15): QuizQuestion[] {
  if (!terms.length) return [];
  const selected = terms
    .map((term, sourceIndex) => ({ term, order: stableHash(`${term.id}-${sourceIndex}-${terms.length}`) }))
    .sort((a, b) => a.order - b.order)
    .slice(0, Math.min(count, terms.length))
    .map(({ term }) => term);
  return selected.map((term, index) => {
    const distractors = terms
      .filter((candidate) => candidate.id !== term.id && candidate.definition !== term.definition)
      .sort((a, b) => stableHash(`${term.id}-${a.id}-${index}`) - stableHash(`${term.id}-${b.id}-${index}`))
      .slice(0, 3)
      .map((candidate) => candidate.definition);
    while (distractors.length < 3) distractors.push("A general activity measure that does not describe this concept");
    const correctIndex = stableHash(`${term.id}-${index}`) % 4;
    const options = [...distractors];
    options.splice(correctIndex, 0, term.definition);
    return {
      id: `term-quiz-${stableHash(`${term.id}-${index}-${count}`).toString(36)}`,
      prompt: `What does “${term.term}” mean in a workplace conversation?`,
      options,
      correctIndex,
      explanation: `${term.definition} In practice: ${term.inPractice}`,
      category: term.category,
      focusTerm: term.term,
    };
  });
}
