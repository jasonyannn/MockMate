"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { analyseCandidate, coachAnswer, generateInterviewQuestions, generateQuiz } from "@/lib/ai-service";
import { createBlankJob, createDemoWorkspace, SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "@/lib/demo-data";
import type { EvidenceItem, InterviewAnswer, Job, ProfileTemplate, QuizAttempt, StageId, Workspace } from "@/lib/types";

const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: 1, label: "Role & documents", short: "Role" },
  { id: 2, label: "Candidate analysis", short: "Analysis" },
  { id: 3, label: "Mock interview", short: "Interview" },
  { id: 4, label: "Mastery quiz", short: "Quiz" },
  { id: 5, label: "Evidence bank", short: "Evidence" },
  { id: 6, label: "Dashboard", short: "Dashboard" },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(value));
const makeId = () => crypto.randomUUID();

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span>M</span><i /></span>;
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="MockMate home"><BrandMark /><span>MockMate</span></a>
        <div className="landing-links"><a href="#how">How it works</a><a href="#proof">Why it works</a><button className="button button-ghost" onClick={onEnter}>Sign in</button><button className="button button-dark" onClick={onEnter}>Start preparing <span>↗</span></button></div>
      </nav>
      <section id="top" className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> Built for the role you actually want</span>
          <h1>Your experience is strong.<br /><em>Make the evidence impossible to miss.</em></h1>
          <p>Turn any job description into a focused preparation plan — with candidate analysis, realistic interview coaching and a reusable bank of your strongest proof points.</p>
          <div className="hero-actions"><button className="button button-primary button-large" onClick={onEnter}>Build my prep plan <span>→</span></button><span className="microcopy">Private by default · No credit card</span></div>
          <div className="hero-trust"><span>One workspace</span><b>Role fit</b><i>·</i><b>Interview practice</b><i>·</i><b>Evidence mastery</b></div>
        </div>
        <div className="hero-visual" aria-label="MockMate candidate analysis preview">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="preview-card">
            <div className="preview-top"><span className="mini-brand"><BrandMark /> MockMate</span><span className="live-pill"><i /> Analysis ready</span></div>
            <p className="overline">SENIOR PRODUCT MANAGER · AI</p>
            <div className="score-lockup"><div className="score-orb"><span>82</span><small>alignment</small></div><div><h3>Strong match</h3><p>Your customer and AI evidence leads. One leadership gap needs a sharper story.</p></div></div>
            <div className="match-bars">
              {[['Technical skills', 86], ['Domain experience', 84], ['Leadership', 77], ['Communication', 81]].map(([label, score]) => <div key={String(label)}><span>{label}</span><div><i style={{ width: `${score}%` }} /></div><b>{score}</b></div>)}
            </div>
            <div className="evidence-preview"><span>✓</span><div><small>EVIDENCE FOUND</small><strong>“Increased weekly active use by 31%”</strong><p>Maps to customer-led product strategy</p></div></div>
          </div>
          <div className="float-note note-one"><span>03</span><div><b>Proof points ready</b><small>Saved to your evidence bank</small></div></div>
          <div className="float-note note-two"><span>↗</span><div><b>+14 points</b><small>Since first analysis</small></div></div>
        </div>
      </section>
      <section id="how" className="landing-strip">
        <p>From application to interview room</p>
        {STAGES.slice(0, 5).map((stage, index) => <div key={stage.id}><span>0{index + 1}</span>{stage.short}</div>)}
      </section>
      <section id="proof" className="proof-section">
        <div><span className="eyebrow">A BETTER PREP LOOP</span><h2>Stop practising in the abstract.</h2></div>
        <div className="proof-grid">
          <article><span>⌁</span><h3>See the real gap</h3><p>Map the role’s requirements to evidence already in your resume, then see exactly what is missing.</p></article>
          <article><span>◎</span><h3>Practise with purpose</h3><p>Answer role-specific questions and get repeatable coaching against a clear, evidence-led rubric.</p></article>
          <article><span>✦</span><h3>Build reusable proof</h3><p>Turn achievements into a living evidence bank you can reuse across every application.</p></article>
        </div>
      </section>
      <footer className="landing-footer"><a className="brand" href="#top"><BrandMark /><span>MockMate</span></a><p>Evidence wins interviews.</p><button className="text-button" onClick={onEnter}>Open private workspace →</button></footer>
    </main>
  );
}

export function MockMateApp() {
  const [entered, setEntered] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(() => createDemoWorkspace());
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "offline">("loading");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNav, setMobileNav] = useState(false);
  const firstSave = useRef(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("mockmate-theme");
    if (savedTheme === "dark") queueMicrotask(() => setTheme("dark"));
    fetch("/api/workspace")
      .then((response) => response.json())
      .then((payload) => { const data = payload as { workspace?: Workspace | null; persistence?: string }; if (data.workspace?.version === 1) setWorkspace(data.workspace); setSaveState(data.persistence === "unavailable" ? "offline" : "saved"); })
      .catch(() => setSaveState("offline"))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mockmate-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) firstSave.current = false;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(workspace) })
        .then((response) => { if (!response.ok) throw new Error("save failed"); setSaveState("saved"); })
        .catch(() => setSaveState("offline"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [workspace, loaded]);

  const activeJob = workspace.jobs.find((job) => job.id === workspace.activeJobId) ?? workspace.jobs[0];

  function updateActiveJob(update: Partial<Job> | ((job: Job) => Job)) {
    setWorkspace((current) => ({
      ...current,
      jobs: current.jobs.map((job) => job.id === current.activeJobId
        ? typeof update === "function" ? update(job) : { ...job, ...update, updatedAt: new Date().toISOString() }
        : job),
    }));
  }

  function setStage(stage: StageId) {
    updateActiveJob({ activeStage: stage });
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addJob() {
    const job = createBlankJob();
    setWorkspace((current) => ({ ...current, activeJobId: job.id, jobs: [...current.jobs, job] }));
    setStage(1);
  }

  if (!entered) return <Landing onEnter={() => setEntered(true)} />;

  const stageComplete = (stage: StageId) => {
    if (stage === 1) return Boolean(activeJob.title && activeJob.description && activeJob.resume);
    if (stage === 2) return Boolean(activeJob.analysis);
    if (stage === 3) return Object.keys(activeJob.interviewAnswers).length > 0;
    if (stage === 4) return activeJob.quizAttempts.length > 0;
    if (stage === 5) return workspace.evidenceItems.length > 0;
    return false;
  };

  return (
    <div className="app-shell">
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top"><button className="brand brand-button" onClick={() => setEntered(false)}><BrandMark /><span>MockMate</span></button><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div>
        <div className="workspace-label">PREP WORKSPACE</div>
        <nav className="stage-nav" aria-label="Preparation stages">
          {STAGES.map((stage) => <button key={stage.id} className={activeJob.activeStage === stage.id ? "active" : ""} onClick={() => setStage(stage.id)}><span className={stageComplete(stage.id) ? "complete" : ""}>{stageComplete(stage.id) ? "✓" : stage.id}</span><div><b>{stage.label}</b><small>{stage.id === 1 ? "Target & profile" : stage.id === 2 ? "Fit & gaps" : stage.id === 3 ? "Practise & coach" : stage.id === 4 ? "Test your knowledge" : stage.id === 5 ? "Your proof points" : "Readiness at a glance"}</small></div></button>)}
        </nav>
        <div className="sidebar-card"><span>✦</span><div><b>Prep momentum</b><p>{Math.round((STAGES.filter((stage) => stageComplete(stage.id)).length / 5) * 100)}% of your plan is active</p><div><i style={{ width: `${Math.round((STAGES.filter((stage) => stageComplete(stage.id)).length / 5) * 100)}%` }} /></div></div></div>
        <div className="sidebar-foot"><button><span className="avatar">MC</span><div><b>Maya Chen</b><small>Private workspace</small></div><i>•••</i></button></div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation">☰</button>
          <div className="job-switcher"><span className="job-dot" /><select value={activeJob.id} onChange={(event) => setWorkspace((current) => ({ ...current, activeJobId: event.target.value }))} aria-label="Current job">{workspace.jobs.map((job) => <option key={job.id} value={job.id}>{job.title || "Untitled role"}{job.company ? ` · ${job.company}` : ""}</option>)}</select><button onClick={addJob} title="Add another job" aria-label="Add another job">＋</button></div>
          <div className="header-actions"><span className={`save-status ${saveState}`}><i />{saveState === "loading" ? "Loading" : saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Preview mode"}</span><button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}><span>{theme === "light" ? "☼" : "☾"}</span></button><button className="help-button" aria-label="Help">?</button></div>
        </header>
        <main className="workspace-main">
          <div className="stage-kicker">STAGE {activeJob.activeStage} OF 6</div>
          {activeJob.activeStage === 1 && <RoleDocuments job={activeJob} templates={workspace.templates} updateJob={updateActiveJob} updateTemplates={(templates) => setWorkspace((current) => ({ ...current, templates }))} onAnalyse={() => setStage(2)} />}
          {activeJob.activeStage === 2 && <CandidateAnalysis job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(3)} />}
          {activeJob.activeStage === 3 && <MockInterview job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(4)} />}
          {activeJob.activeStage === 4 && <MasteryQuiz job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(5)} />}
          {activeJob.activeStage === 5 && <EvidenceBank job={activeJob} items={workspace.evidenceItems} updateItems={(evidenceItems) => setWorkspace((current) => ({ ...current, evidenceItems }))} onNext={() => setStage(6)} />}
          {activeJob.activeStage === 6 && <Dashboard job={activeJob} evidenceItems={workspace.evidenceItems} onReviewGaps={() => setStage(2)} />}
        </main>
      </div>
    </div>
  );
}

function StageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="stage-heading"><div>{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function RoleDocuments({ job, templates, updateJob, updateTemplates, onAnalyse }: { job: Job; templates: ProfileTemplate[]; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; updateTemplates: (templates: ProfileTemplate[]) => void; onAnalyse: () => void }) {
  const [uploading, setUploading] = useState<"resume" | "cover" | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [templateName, setTemplateName] = useState(templates.find((item) => item.id === job.templateId)?.name ?? "");
  const [showTemplates, setShowTemplates] = useState(false);
  const canAnalyse = Boolean(job.title.trim() && job.description.trim() && job.resume?.extractedText);

  async function upload(file: File, kind: "resume" | "cover") {
    setUploading(kind); setUploadError("");
    const form = new FormData(); form.append("file", file); form.append("kind", kind === "cover" ? "cover-letter" : "resume"); form.append("jobId", job.id);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json() as { error?: string; document?: Job["resume"] };
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (!data.document) throw new Error("The document response was incomplete");
      updateJob(kind === "resume" ? { resume: data.document } : { coverLetterDocument: data.document, coverLetterText: data.document.extractedText || job.coverLetterText });
    } catch (error) {
      if (["text/plain", "text/markdown"].includes(file.type) || /\.(txt|md)$/i.test(file.name)) {
        const text = await file.text();
        const document = { id: makeId(), filename: file.name, contentType: file.type || "text/plain", storageKey: "local-preview", extractedText: text, characterCount: text.length, status: "extracted" as const };
        updateJob(kind === "resume" ? { resume: document } : { coverLetterDocument: document, coverLetterText: text });
        setUploadError("Stored in this preview session; hosted document storage will retain the original.");
      } else setUploadError(error instanceof Error ? error.message : "Could not process that document");
    } finally { setUploading(null); }
  }

  function loadExample() {
    updateJob({
      title: "Senior Product Manager, AI", company: "Lumon Labs", description: SAMPLE_JOB_DESCRIPTION,
      resume: { id: makeId(), filename: "Example_Product_Resume.txt", contentType: "text/plain", storageKey: "example", extractedText: SAMPLE_RESUME, characterCount: SAMPLE_RESUME.length, status: "extracted" },
    });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) { updateJob({ templateId: null }); return; }
    setTemplateName(template.name);
    updateJob({ templateId, resume: template.resume, coverLetterDocument: template.coverLetterDocument, coverLetterText: template.coverLetterText, portfolioUrl: template.portfolioUrl, linkedinUrl: template.linkedinUrl });
  }

  function saveTemplate() {
    const name = templateName.trim() || `${job.title || "General"} profile`;
    const existing = templates.find((item) => item.id === job.templateId);
    const template: ProfileTemplate = { id: existing?.id ?? makeId(), name, resume: job.resume, coverLetterDocument: job.coverLetterDocument, coverLetterText: job.coverLetterText, portfolioUrl: job.portfolioUrl, linkedinUrl: job.linkedinUrl, updatedAt: new Date().toISOString() };
    updateTemplates(existing ? templates.map((item) => item.id === existing.id ? template : item) : [...templates, template]);
    updateJob({ templateId: template.id }); setTemplateName(name); setShowTemplates(false);
  }

  function runAnalysis() {
    if (!canAnalyse) return;
    const result = analyseCandidate(job);
    updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }], activeStage: 2 });
    onAnalyse();
  }

  return <>
    <StageHeading title="Start with the role." description="Give MockMate the target and the strongest version of your professional story. You can reuse this profile on every application." action={<button className="button button-soft" onClick={loadExample}>↗ Load example</button>} />
    <div className="template-bar"><div><span className="template-icon">✦</span><div><b>Profile template</b><small>Reuse your resume, links and cover letter</small></div></div><select value={job.templateId ?? ""} onChange={(event) => applyTemplate(event.target.value)}><option value="">Ad-hoc documents</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="text-button" onClick={() => setShowTemplates(!showTemplates)}>{showTemplates ? "Close" : "Manage"}</button></div>
    {showTemplates && <div className="template-editor"><div><label>Template name<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g. Product Leader — AI" /></label><button className="button button-dark" onClick={saveTemplate}>Save profile</button></div><p>Saving updates the reusable template. This job keeps any later per-job overrides.</p></div>}
    <section className="form-card">
      <div className="section-label"><span>01</span><div><h2>Target role</h2><p>The source of truth for every question and recommendation.</p></div></div>
      <div className="field-grid two"><label>Job title <span>Required</span><input value={job.title} onChange={(event) => updateJob({ title: event.target.value })} placeholder="e.g. Senior Product Manager" /></label><label>Company <span>Optional</span><input value={job.company} onChange={(event) => updateJob({ company: event.target.value })} placeholder="e.g. Lumon Labs" /></label></div>
      <label>Job description <span>Required</span><textarea className="jd-textarea" value={job.description} onChange={(event) => updateJob({ description: event.target.value })} placeholder="Paste the complete job description here…" /><small className="field-meta">{job.description.length.toLocaleString()} characters</small></label>
    </section>
    <section className="form-card">
      <div className="section-label"><span>02</span><div><h2>Your profile</h2><p>Upload the evidence you want assessed for this specific role.</p></div></div>
      <div className="upload-grid">
        <div className="upload-block"><div className="field-label">Resume <span>Required</span></div>{job.resume ? <div className="file-card"><span className="file-type">{job.resume.filename.split(".").pop()?.toUpperCase()}</span><div><b>{job.resume.filename}</b><small><i /> {job.resume.status === "extracted" ? `Extracted ${job.resume.characterCount.toLocaleString()} characters` : "Original stored · extraction unavailable"}</small></div><button onClick={() => updateJob({ resume: null })} aria-label="Remove resume">×</button></div> : <label className="dropzone"><input type="file" accept=".pdf,.docx,.txt,.md,.rtf,.pptx" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "resume")} /><span>{uploading === "resume" ? "…" : "↑"}</span><b>{uploading === "resume" ? "Extracting document" : "Drop resume or choose a file"}</b><small>PDF, DOCX, TXT, MD, RTF or PPTX · max 12 MB</small></label>}</div>
        <div className="upload-block"><div className="field-label">Cover letter <span>Optional</span></div>{job.coverLetterDocument ? <div className="file-card"><span className="file-type">{job.coverLetterDocument.filename.split(".").pop()?.toUpperCase()}</span><div><b>{job.coverLetterDocument.filename}</b><small><i /> {job.coverLetterDocument.characterCount.toLocaleString()} characters available</small></div><button onClick={() => updateJob({ coverLetterDocument: null })} aria-label="Remove cover letter">×</button></div> : <label className="dropzone compact"><input type="file" accept=".pdf,.docx,.txt,.md,.rtf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "cover")} /><span>{uploading === "cover" ? "…" : "↑"}</span><b>{uploading === "cover" ? "Extracting document" : "Upload cover letter"}</b><small>Or paste the text below</small></label>}</div>
      </div>
      {uploadError && <p className="inline-alert">{uploadError}</p>}
      <label>Cover letter text <span>Optional</span><textarea value={job.coverLetterText} onChange={(event) => updateJob({ coverLetterText: event.target.value })} placeholder="Paste or tailor your cover letter…" /></label>
      <div className="field-grid two"><label>Portfolio URL <span>Optional</span><input type="url" value={job.portfolioUrl} onChange={(event) => updateJob({ portfolioUrl: event.target.value })} placeholder="https://yourportfolio.com" /></label><label>LinkedIn profile <span>Optional</span><input type="url" value={job.linkedinUrl} onChange={(event) => updateJob({ linkedinUrl: event.target.value })} placeholder="https://linkedin.com/in/…" /></label></div>
    </section>
    <div className="sticky-action"><div><b>{canAnalyse ? "Everything is ready." : "Add the role, description and resume to continue."}</b><small>Analysis uses a rubric-pinned service for consistent comparisons.</small></div><button className="button button-primary button-large" disabled={!canAnalyse} onClick={runAnalysis}>Analyse candidate against role <span>→</span></button></div>
  </>;
}

function CandidateAnalysis({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const [requirement, setRequirement] = useState("");
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const analysis = job.analysis ?? analyseCandidate(job);
  function reanalyse() { const result = analyseCandidate(job); updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }] }); }
  function updateRequirements(requirements: typeof analysis.requirements) { updateJob({ analysis: { ...analysis, requirements, gaps: requirements.filter((item) => !item.covered).map((item) => item.label) } }); }
  return <>
    <StageHeading eyebrow="ANALYSIS COMPLETE" title="You’re a strong match." description="Your experience covers the core of this role. The fastest gain now is making two missing proof points concrete." action={<button className="button button-soft" onClick={reanalyse}>↻ Re-analyse</button>} />
    <div className="score-grid">
      <section className="score-card primary-score"><div className="score-ring" style={{ "--score": analysis.alignmentScore } as CSSProperties}><div><strong>{analysis.alignmentScore}</strong><span>/ 100</span></div></div><div><span className="overline">ALIGNMENT SCORE</span><h2>{analysis.alignmentScore >= 80 ? "Strong match" : analysis.alignmentScore >= 65 ? "Promising match" : "Developing match"}</h2><p>Resume and cover letter evidence against the detected role requirements.</p><small>Rubric {analysis.rubricVersion}</small></div></section>
      <section className="score-card reputation-card"><div className="empty-score">—</div><div><span className="overline">REPUTATION SCORE</span><h2>{analysis.reputationScore ?? "Not available"}</h2><p>{analysis.reputationScore ? "Based on profile text supplied by you." : "LinkedIn does not provide this data through standard public API access."}</p><button className="text-button" onClick={() => setShowLinkedIn(!showLinkedIn)}>{showLinkedIn ? "Close profile input" : "Add profile text safely →"}</button></div></section>
    </div>
    {showLinkedIn && <section className="linkedin-panel"><div><span>in</span><div><b>No scraping. No invented score.</b><p>Paste text from your LinkedIn PDF export or profile. Official OAuth can be connected later if approved scopes are available.</p></div></div><textarea value={job.linkedinProfileText} onChange={(event) => updateJob({ linkedinProfileText: event.target.value })} placeholder="Paste headline, About and experience text…" /><button className="button button-dark" onClick={reanalyse}>Save & re-analyse</button></section>}
    <div className="analysis-layout">
      <section className="panel competency-panel"><div className="panel-head"><div><span className="overline">COMPETENCY BREAKDOWN</span><h2>Where your match comes from</h2></div><span className="legend"><i /> Your evidence</span></div><div className="competency-list">{analysis.categories.map((category) => <div key={category.label}><div><b>{category.label}</b><span>{category.score}</span></div><div className="bar"><i style={{ width: `${category.score}%` }} /></div><p>{category.note}</p></div>)}</div></section>
      <section className="panel requirements-panel"><div className="panel-head"><div><span className="overline">REQUIREMENTS DETECTED</span><h2>{analysis.requirements.length} role signals</h2></div><span className="mini-pill">Editable</span></div><div className="requirement-list">{analysis.requirements.map((item) => <div key={item.id}><button className={item.covered ? "covered" : "gap"} onClick={() => updateRequirements(analysis.requirements.map((req) => req.id === item.id ? { ...req, covered: !req.covered } : req))}>{item.covered ? "✓" : "!"}</button><span>{item.label}<small>{item.type}</small></span><button className="remove-button" onClick={() => updateRequirements(analysis.requirements.filter((req) => req.id !== item.id))}>×</button></div>)}</div><div className="add-requirement"><input value={requirement} onChange={(event) => setRequirement(event.target.value)} placeholder="Add a missed requirement" onKeyDown={(event) => { if (event.key === "Enter" && requirement.trim()) { updateRequirements([...analysis.requirements, { id: makeId(), label: requirement.trim(), type: "hard", covered: false }]); setRequirement(""); } }} /><button onClick={() => { if (requirement.trim()) { updateRequirements([...analysis.requirements, { id: makeId(), label: requirement.trim(), type: "hard", covered: false }]); setRequirement(""); } }}>＋</button></div></section>
    </div>
    <div className="evidence-columns">
      <section className="panel"><div className="panel-head success"><div><span className="overline">✓ EVIDENCE FOUND</span><h2>Your strongest matches</h2></div><b>{analysis.evidenceFound.length}</b></div><div className="mapping-list">{analysis.evidenceFound.map((item) => <article key={item.id}><div><small>ROLE NEEDS</small><p>{item.requirement}</p></div><span>→</span><div><small>YOUR EVIDENCE · {item.source}</small><p>“{item.evidence}”</p></div></article>)}</div></section>
      <section className="panel gap-panel"><div className="panel-head warning"><div><span className="overline">! EVIDENCE GAPS</span><h2>Prep these next</h2></div><b>{analysis.gaps.length}</b></div><div className="gap-list">{analysis.gaps.map((gap, index) => <article key={gap}><span>0{index + 1}</span><div><b>{gap}</b><p>Prepare one recent example with your action and a measurable outcome.</p></div></article>)}</div></section>
    </div>
    <div className="stage-next"><div><span>NEXT UP</span><b>Turn these signals into confident answers.</b></div><button className="button button-primary" onClick={onNext}>Start mock interview <span>→</span></button></div>
  </>;
}

function MockInterview({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const questions = useMemo(() => generateInterviewQuestions(job), [job]);
  const [page, setPage] = useState(0); const [selected, setSelected] = useState(0); const [listOpen, setListOpen] = useState(true); const [listening, setListening] = useState(false);
  const pageQuestions = questions.slice(page * 14, page * 14 + 14); const question = questions[selected]; const answer = job.interviewAnswers[question.id] ?? { text: "", mode: "writing" as const, updatedAt: new Date().toISOString() };
  const attempted = Object.values(job.interviewAnswers).filter((item) => item.text.trim()).length;
  function saveAnswer(next: InterviewAnswer) { updateJob({ interviewAnswers: { ...job.interviewAnswers, [question.id]: next } }); }
  function coach() { if (!answer.text.trim()) return; saveAnswer({ ...answer, result: coachAnswer(answer.text, question, job), updatedAt: new Date().toISOString() }); }
  function speakQuestion() { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(question.prompt)); }
  function record() {
    type Recognition = { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void; onend: () => void; start: () => void };
    const Constructor = (window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;
    if (!Constructor) { saveAnswer({ ...answer, mode: "speaking" }); return; }
    const recognition = new Constructor(); recognition.lang = "en-AU"; recognition.interimResults = false; setListening(true);
    recognition.onresult = (event) => saveAnswer({ text: `${answer.text} ${event.results[0][0].transcript}`.trim(), mode: "speaking", updatedAt: new Date().toISOString() });
    recognition.onend = () => setListening(false); recognition.start();
  }
  function selectQuestion(index: number) { setSelected(index); setPage(Math.floor(index / 14)); if (window.innerWidth < 900) setListOpen(false); }
  return <>
    <StageHeading title="Practise the moments that matter." description={`${questions.length} questions generated from this role, your evidence and the gaps worth preparing.`} action={<div className="progress-stat"><strong>{attempted}</strong><span>of {questions.length}<small>attempted</small></span></div>} />
    <div className="interview-shell">
      <aside className={listOpen ? "question-browser open" : "question-browser"}><div className="question-browser-head"><div><span className="overline">QUESTION SET</span><b>{page * 14 + 1}–{Math.min(page * 14 + 14, questions.length)} of {questions.length}</b></div><button onClick={() => setListOpen(false)}>×</button></div><div className="question-items">{pageQuestions.map((item, index) => { const absolute = page * 14 + index; const saved = job.interviewAnswers[item.id]; return <button key={item.id} className={selected === absolute ? "active" : ""} onClick={() => selectQuestion(absolute)}><span>{saved?.result ? "✓" : item.number.toString().padStart(2, "0")}</span><div><small>{item.category}</small><p>{item.prompt}</p></div>{saved?.result && <b>{saved.result.score}</b>}</button>; })}</div><div className="pagination"><button disabled={page === 0} onClick={() => { setPage(page - 1); setSelected((page - 1) * 14); }}>←</button><span>{page + 1} / {Math.ceil(questions.length / 14)}</span><button disabled={page === Math.ceil(questions.length / 14) - 1} onClick={() => { setPage(page + 1); setSelected((page + 1) * 14); }}>→</button></div></aside>
      <section className="practice-panel"><button className="question-list-toggle" onClick={() => setListOpen(!listOpen)}>☷ Question list</button><div className="question-meta"><span>{question.category}</span><span>Question {question.number} of {questions.length}</span></div><h2>{question.prompt}</h2><button className="read-button" onClick={speakQuestion}>◖ Read question</button>
        <div className="answer-mode"><button className={answer.mode === "writing" ? "active" : ""} onClick={() => saveAnswer({ ...answer, mode: "writing" })}>⌨ Writing</button><button className={answer.mode === "speaking" ? "active" : ""} onClick={() => saveAnswer({ ...answer, mode: "speaking" })}>● Speaking</button></div>
        {answer.mode === "speaking" && <button className={listening ? "record-button listening" : "record-button"} onClick={record}><span>{listening ? "■" : "●"}</span><div><b>{listening ? "Listening…" : "Start speaking"}</b><small>{listening ? "Finish your thought — transcription appears below" : "Browser speech recognition · edit the transcript anytime"}</small></div></button>}
        <label className="answer-area"><textarea value={answer.text} onChange={(event) => saveAnswer({ ...answer, text: event.target.value, result: undefined, updatedAt: new Date().toISOString() })} placeholder="Shape your answer with context, your specific actions, and a measurable result…" /><span>{answer.text.trim() ? answer.text.trim().split(/\s+/).length : 0} words · aim for 90 seconds</span></label>
        <div className="coach-actions"><button className="button button-soft" onClick={() => saveAnswer({ text: "", mode: answer.mode, updatedAt: new Date().toISOString() })}>↻ Reset</button><button className="button button-primary" disabled={!answer.text.trim()} onClick={coach}>✦ Coach my answer</button></div>
        {answer.result && <div className="coach-result"><div className="coach-score"><span>{answer.result.score}</span><div><small>COACH SCORE</small><b>{answer.result.score >= 85 ? "Interview ready" : answer.result.score >= 70 ? "Strong foundation" : "Needs one more pass"}</b><p>Rubric {answer.result.rubricVersion}</p></div></div><div className="breakdown-grid">{answer.result.breakdown.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.score}</b><div><i style={{ width: `${item.score}%` }} /></div></div>)}</div><div className="feedback-block"><h3>Why this score</h3>{answer.result.critique.map((item) => <p key={item}><span>→</span>{item}</p>)}</div><div className="model-answer"><div><span>✦</span><h3>A model 100-point answer</h3><small>Use the structure, never memorise the script.</small></div><p>{answer.result.modelAnswer}</p></div></div>}
      </section>
    </div>
    <div className="stage-next"><div><span>WHEN YOU’RE READY</span><b>Test your role and domain knowledge.</b></div><button className="button button-primary" onClick={onNext}>Open mastery quiz <span>→</span></button></div>
  </>;
}

function MasteryQuiz({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const [count, setCount] = useState<5 | 10 | 15>(10); const questions = useMemo(() => generateQuiz(job, count), [job, count]);
  const [answers, setAnswers] = useState<Record<string, number>>({}); const [finished, setFinished] = useState(false);
  const correct = questions.filter((item) => answers[item.id] === item.correctIndex).length; const answered = Object.keys(answers).length; const score = Math.round((correct / count) * 100);
  function finish() { if (answered < count) return; const attempt: QuizAttempt = { id: makeId(), score, correct, total: count, createdAt: new Date().toISOString() }; updateJob({ quizAttempts: [...job.quizAttempts, attempt] }); setFinished(true); }
  function restart(nextCount = count) { setCount(nextCount); setAnswers({}); setFinished(false); }
  return <>
    <StageHeading title="Know the role. Not just the script." description="Test the judgement, concepts and trade-offs this role is likely to demand." action={<div className="count-picker"><span>Questions</span>{([5, 10, 15] as const).map((value) => <button key={value} className={count === value ? "active" : ""} onClick={() => restart(value)}>{value}</button>)}</div>} />
    {!finished ? <div className="quiz-layout"><section className="quiz-progress-panel"><div className="quiz-progress-ring" style={{ "--progress": Math.round((answered / count) * 100) } as CSSProperties}><strong>{answered}</strong><span>/ {count}</span></div><h3>Your progress</h3><p>Choose an answer to reveal the reasoning immediately.</p><div className="quiz-dots">{questions.map((question, index) => <button key={question.id} className={answers[question.id] !== undefined ? answers[question.id] === question.correctIndex ? "correct" : "wrong" : ""} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{index + 1}</button>)}</div><button className="button button-primary" disabled={answered < count} onClick={finish}>Complete quiz →</button></section><section className="quiz-questions">{questions.map((question, questionIndex) => { const choice = answers[question.id]; return <article key={question.id} id={question.id} className={choice !== undefined ? "answered" : ""}><div className="quiz-number">{String(questionIndex + 1).padStart(2, "0")}</div><h2>{question.prompt}</h2><div className="quiz-options">{question.options.map((option, optionIndex) => <button key={option} disabled={choice !== undefined} className={choice !== undefined ? optionIndex === question.correctIndex ? "correct" : optionIndex === choice ? "wrong" : "muted" : ""} onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}<i>{choice !== undefined && optionIndex === question.correctIndex ? "✓" : choice === optionIndex ? "×" : ""}</i></button>)}</div>{choice !== undefined && <div className={choice === question.correctIndex ? "explanation correct" : "explanation"}><b>{choice === question.correctIndex ? "✓ Correct" : `The best answer is ${String.fromCharCode(65 + question.correctIndex)}`}</b><p>{question.explanation}</p></div>}</article>; })}</section></div> : <section className="quiz-summary"><span className="celebration">✦</span><p className="overline">MASTERY QUIZ COMPLETE</p><h1>{score >= 80 ? "You know your material." : "A solid baseline."}</h1><div className="summary-score"><strong>{score}</strong><span>/ 100</span></div><p>You answered <b>{correct} of {count}</b> questions correctly. {score >= 80 ? "You’re demonstrating strong role judgement." : "Review the explanations, then take another pass."}</p><div><button className="button button-soft" onClick={() => restart()}>↻ Try again</button><button className="button button-primary" onClick={onNext}>Build evidence bank →</button></div></section>}
    {!finished && <div className="stage-next"><div><span>YOUR HISTORY</span><b>{job.quizAttempts.length ? `Latest saved score: ${job.quizAttempts.at(-1)?.score}%` : "Complete your first quiz to start a trend."}</b></div><button className="button button-soft" onClick={onNext}>Skip to evidence bank →</button></div>}
  </>;
}

function EvidenceBank({ job, items, updateItems, onNext }: { job: Job; items: EvidenceItem[]; updateItems: (items: EvidenceItem[]) => void; onNext: () => void }) {
  const [search, setSearch] = useState(""); const [tag, setTag] = useState("All"); const [editing, setEditing] = useState<EvidenceItem | null>(null); const [showSuggested, setShowSuggested] = useState(true);
  const tags = ["All", ...new Set(items.flatMap((item) => item.tags))]; const filtered = items.filter((item) => (tag === "All" || item.tags.includes(tag)) && `${item.title} ${item.description} ${item.metric}`.toLowerCase().includes(search.toLowerCase()));
  const suggestions = (job.analysis?.evidenceFound ?? []).filter((match) => !items.some((item) => item.description.includes(match.evidence.slice(0, 40))));
  function addSuggestion(match: NonNullable<Job["analysis"]>["evidenceFound"][number]) { updateItems([...items, { id: makeId(), title: match.requirement, description: match.evidence, metric: "", sourceJobId: job.id, source: match.source, tags: ["Suggested", match.requirement.split(" ")[0]], createdAt: new Date().toISOString() }]); }
  function save(item: EvidenceItem) { updateItems(items.some((entry) => entry.id === item.id) ? items.map((entry) => entry.id === item.id ? item : entry) : [item, ...items]); setEditing(null); }
  return <>
    <StageHeading title="Your proof, ready when you need it." description="A reusable library of outcomes, stories and metrics for resumes, cover letters and interview answers." action={<button className="button button-primary" onClick={() => setEditing({ id: makeId(), title: "", description: "", metric: "", sourceJobId: job.id, source: job.title, tags: [], createdAt: new Date().toISOString() })}>＋ Add evidence</button>} />
    {showSuggested && suggestions.length > 0 && <section className="suggestion-strip"><div><span>✦</span><div><b>{suggestions.length} proof points found in your latest analysis</b><p>Add them now, then sharpen the story and metric later.</p></div></div><div>{suggestions.slice(0, 2).map((match) => <button key={match.id} onClick={() => addSuggestion(match)}>＋ {match.requirement}</button>)}<button className="dismiss" onClick={() => setShowSuggested(false)}>×</button></div></section>}
    <div className="evidence-toolbar"><label><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search achievements, metrics or stories…" /></label><div className="tag-filters">{tags.slice(0, 6).map((item) => <button key={item} className={tag === item ? "active" : ""} onClick={() => setTag(item)}>{item}</button>)}</div><span>{filtered.length} items</span></div>
    <div className="evidence-grid">{filtered.map((item) => <article key={item.id} className="evidence-card"><div className="evidence-card-top"><span>✦</span><button onClick={() => setEditing(item)}>•••</button></div><h2>{item.title}</h2><p>{item.description}</p>{item.metric && <strong>{item.metric}</strong>}<div className="evidence-tags">{item.tags.map((itemTag) => <span key={itemTag}>{itemTag}</span>)}</div><footer><span>{item.source}</span><small>{formatDate(item.createdAt)}</small></footer></article>)}{!filtered.length && <div className="empty-state"><span>⌕</span><h2>No evidence found</h2><p>Try another search or add a new proof point.</p></div>}</div>
    {editing && <EvidenceEditor item={editing} onSave={save} onDelete={() => { updateItems(items.filter((item) => item.id !== editing.id)); setEditing(null); }} onClose={() => setEditing(null)} />}
    <div className="stage-next"><div><span>THE PAYOFF</span><b>See how all your preparation adds up.</b></div><button className="button button-primary" onClick={onNext}>View readiness dashboard <span>→</span></button></div>
  </>;
}

function EvidenceEditor({ item, onSave, onDelete, onClose }: { item: EvidenceItem; onSave: (item: EvidenceItem) => void; onDelete: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(item); const [tags, setTags] = useState(item.tags.join(", "));
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal"><div className="modal-head"><div><span className="overline">EVIDENCE ITEM</span><h2>{item.title ? "Sharpen this proof point" : "Add a proof point"}</h2></div><button onClick={onClose}>×</button></div><label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Enterprise launch impact" /></label><label>Story / description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What was the situation, what did you do, and why did it matter?" /></label><div className="field-grid two"><label>Metric or impact<input value={draft.metric} onChange={(event) => setDraft({ ...draft, metric: event.target.value })} placeholder="e.g. +31% adoption" /></label><label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Leadership, AI, Growth" /></label></div><div className="modal-actions"><button className="text-button danger" onClick={onDelete}>Delete</button><div><button className="button button-soft" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={!draft.title.trim() || !draft.description.trim()} onClick={() => onSave({ ...draft, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) })}>Save evidence</button></div></div></section></div>;
}

function Dashboard({ job, evidenceItems, onReviewGaps }: { job: Job; evidenceItems: EvidenceItem[]; onReviewGaps: () => void }) {
  const analysis = job.analysis ?? analyseCandidate(job); const answers = Object.values(job.interviewAnswers).filter((item) => item.result); const average = answers.length ? Math.round(answers.reduce((sum, item) => sum + (item.result?.score ?? 0), 0) / answers.length) : 0; const latestQuiz = job.quizAttempts.at(-1)?.score ?? 0; const readiness = Math.round(analysis.alignmentScore * 0.4 + (average || 55) * 0.25 + (latestQuiz || 60) * 0.2 + Math.min(100, evidenceItems.length * 18) * 0.15);
  const history = job.analysisHistory.length ? job.analysisHistory : [{ score: analysis.alignmentScore, at: analysis.createdAt }];
  return <>
    <StageHeading eyebrow="YOUR READINESS" title="You’re building real momentum." description={`Your preparation for ${job.title || "this role"} is becoming specific, evidence-backed and easier to recall under pressure.`} action={<button className="button button-soft" onClick={() => window.print()}>↗ Export summary</button>} />
    <section className="readiness-hero"><div className="readiness-ring" style={{ "--readiness": readiness } as CSSProperties}><div><strong>{readiness}</strong><span>readiness</span></div></div><div><span className="overline">OVERALL PREPARATION</span><h2>{readiness >= 80 ? "Interview ready" : "Nearly there"}</h2><p>{readiness >= 80 ? "Your evidence and role knowledge are strong. Keep answers concise and protect your best metrics." : "Close the remaining evidence gaps and coach three more answers to push this plan over the line."}</p><div className="readiness-tags"><span>✓ Role analysed</span><span>✓ Evidence organised</span><span className={answers.length >= 3 ? "" : "pending"}>{answers.length >= 3 ? "✓" : "○"} 3 answers coached</span></div></div><button className="button button-primary" onClick={onReviewGaps}>Review {analysis.gaps.length} evidence gaps →</button></section>
    <div className="metric-grid"><article><span className="metric-icon coral">↗</span><div><small>ALIGNMENT</small><strong>{analysis.alignmentScore}<i>/100</i></strong><p><b>+{Math.max(0, analysis.alignmentScore - history[0].score)}</b> since first analysis</p></div></article><article><span className="metric-icon purple">◉</span><div><small>INTERVIEW PRACTICE</small><strong>{Object.keys(job.interviewAnswers).length}<i>/112</i></strong><p>{average ? <><b>{average}</b> average coach score</> : "Start with three priority questions"}</p></div></article><article><span className="metric-icon blue">◇</span><div><small>MASTERY</small><strong>{latestQuiz || "—"}<i>{latestQuiz ? "%" : ""}</i></strong><p>{job.quizAttempts.length} quiz attempt{job.quizAttempts.length === 1 ? "" : "s"} saved</p></div></article><article><span className="metric-icon gold">✦</span><div><small>EVIDENCE BANK</small><strong>{evidenceItems.length}<i>items</i></strong><p><b>{analysis.gaps.length}</b> gaps still open</p></div></article></div>
    <div className="dashboard-grid"><section className="panel trend-panel"><div className="panel-head"><div><span className="overline">ALIGNMENT TREND</span><h2>Your profile is getting sharper</h2></div><span className="mini-pill">Last {history.length} analyses</span></div><div className="chart-area"><div className="chart-lines"><i /><i /><i /><i /></div><div className="chart-bars">{history.map((point, index) => <div key={`${point.at}-${index}`}><b style={{ bottom: `${Math.max(8, point.score - 45)}%` }}>{point.score}</b><span style={{ height: `${Math.max(12, point.score - 40)}%` }} /><small>{formatDate(point.at)}</small></div>)}</div></div></section><section className="panel focus-panel"><div className="panel-head"><div><span className="overline">NEXT BEST ACTIONS</span><h2>Highest-leverage prep</h2></div></div><div className="action-list">{analysis.gaps.slice(0, 3).map((gap, index) => <button key={gap} onClick={onReviewGaps}><span>{String(index + 1).padStart(2, "0")}</span><div><b>Prepare evidence for {gap}</b><p>Add a concrete situation, action and outcome.</p></div><i>→</i></button>)}{answers.length < 3 && <button><span>{String(Math.min(4, analysis.gaps.length + 1)).padStart(2, "0")}</span><div><b>Coach {3 - answers.length} priority answer{3 - answers.length === 1 ? "" : "s"}</b><p>Build calm through a repeatable STAR structure.</p></div><i>→</i></button>}</div></section></div>
    <section className="panel activity-panel"><div className="panel-head"><div><span className="overline">PREPARATION HISTORY</span><h2>Small sessions, compounding confidence</h2></div></div><div className="activity-list"><div><span className="activity-dot coral">↗</span><div><b>Candidate analysis completed</b><p>{analysis.evidenceFound.length} matching proof points and {analysis.gaps.length} gaps identified</p></div><small>{formatDate(analysis.createdAt)}</small></div>{job.quizAttempts.slice(-2).reverse().map((attempt) => <div key={attempt.id}><span className="activity-dot blue">◇</span><div><b>Mastery quiz · {attempt.score}%</b><p>{attempt.correct} of {attempt.total} questions correct</p></div><small>{formatDate(attempt.createdAt)}</small></div>)}{evidenceItems.slice(0, 2).map((item) => <div key={item.id}><span className="activity-dot gold">✦</span><div><b>Evidence saved · {item.title}</b><p>{item.metric || item.description.slice(0, 75)}</p></div><small>{formatDate(item.createdAt)}</small></div>)}</div></section>
  </>;
}
