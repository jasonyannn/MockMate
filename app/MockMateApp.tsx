"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { SettingsDialog } from "./SettingsDialog";
import { SpeechPractice } from "./SpeechPractice";
import { TerminologyLab } from "./TerminologyLab";
import { getAIStatus, requestAI } from "@/lib/ai-client";
import { AI_SERVICE_CONFIG, analyseCandidate, coachAnswer, generateInterviewQuestions, generateQuiz } from "@/lib/ai-service";
import { createBlankJob, createBlankWorkspace, SAMPLE_JOB_DESCRIPTION, SAMPLE_RESUME } from "@/lib/demo-data";
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_KEY, readPreferences } from "@/lib/preferences";
import { coachScoreLabel } from "@/lib/scoring-core";
import { documentDisplayName, normalizeDocumentLibrary } from "@/lib/document-library";
import type { AppPreferences } from "@/lib/preferences";
import type { AIProvenance, AnalysisResult, CoachResult, EvidenceItem, InterviewAnswer, InterviewQuestion, Job, ProfileTemplate, QuizAttempt, QuizQuestion, SavedCoverLetter, SavedResume, StageId, Workspace } from "@/lib/types";
import type { AIStatus } from "@/lib/ai-client";

const STAGES: { id: StageId; label: string; short: string }[] = [
  { id: 1, label: "Role & documents", short: "Role" },
  { id: 2, label: "Candidate analysis", short: "Analysis" },
  { id: 3, label: "Mock interview", short: "Interview" },
  { id: 4, label: "Knowledge lab", short: "Fluency" },
  { id: 5, label: "Evidence bank", short: "Evidence" },
  { id: 6, label: "Dashboard", short: "Dashboard" },
];

const formatDate = (value: string) => new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(new Date(value));
const makeId = () => crypto.randomUUID();

function recalibrateWorkspace(workspace: Workspace): Workspace {
  const normalized = normalizeDocumentLibrary(workspace);
  let changed = false;
  const jobs = normalized.jobs.map((sourceJob) => {
    let job = Array.isArray(sourceJob.linkedinDocuments) ? sourceJob : { ...sourceJob, linkedinDocuments: [] };
    if (job !== sourceJob) changed = true;
    if (!Array.isArray(job.customInterviewQuestions)) {
      job = { ...job, customInterviewQuestions: [] };
      changed = true;
    }
    const generatedQuestions = job.interviewQuestions?.length ? job.interviewQuestions : generateInterviewQuestions(job);
    const customQuestions = job.customInterviewQuestions ?? [];
    const questions = new Map([...generatedQuestions, ...customQuestions].map((question) => [question.id, question]));
    const interviewAnswers = Object.fromEntries(Object.entries(job.interviewAnswers).map(([id, answer]) => {
      const question = questions.get(id);
      if (!question || !answer.text.trim() || !answer.result || answer.result.rubricVersion === AI_SERVICE_CONFIG.coachingRubricVersion) return [id, answer];
      changed = true;
      return [id, { ...answer, result: coachAnswer(answer.text, question, job), updatedAt: new Date().toISOString() }];
    }));
    return interviewAnswers === job.interviewAnswers ? job : { ...job, interviewAnswers };
  });
  return changed ? { ...normalized, jobs } : normalized;
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><span>M</span><i /></span>;
}

function AIProvenanceBadge({ value }: { value?: AIProvenance }) {
  const isAI = value?.mode === "openai";
  return <span className={isAI ? "ai-provenance is-ai" : "ai-provenance is-fallback"} title={value?.reason}>{isAI ? `✦ AI · ${value.model}` : "◇ Verified fallback"}</span>;
}

function WorkflowStatus({ job, completed, aiStatus }: { job: Job; completed: number; aiStatus: AIStatus | null }) {
  const stage = STAGES.find((item) => item.id === job.activeStage) ?? STAGES[0];
  return <section className="workflow-status" aria-label="Preparation workflow status">
    <div><span>OUTCOME</span><b>Interview-ready for {job.title || "your target role"}</b></div>
    <div><span>CURRENT ACTION</span><b>{stage.label}</b><small>{stage.id === 1 ? "Ground the plan in role and candidate evidence" : stage.id === 2 ? "Verify fit, proof and genuine gaps" : stage.id === 3 ? "Practise and improve priority answers" : stage.id === 4 ? "Build fluency and test role judgement" : stage.id === 5 ? "Turn claims into reusable proof" : "Review evidence and choose the next action"}</small></div>
    <div><span>VERIFIED EVIDENCE</span><b>{completed} of 5 preparation gates</b><small>{aiStatus?.configured ? `AI reasoning active · ${aiStatus.model}` : "Rubric fallback active · AI key not connected"}</small></div>
  </section>;
}

type MockMateUser = { userId: string; displayName: string; email: string; fullName: string | null };

function Landing({ user, signInPath, onEnter, onSettings }: { user: MockMateUser | null; signInPath: string; onEnter: () => void; onSettings: () => void }) {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="MockMate home"><BrandMark /><span>MockMate</span></a>
        <div className="landing-links"><a href="#how">How it works</a><a href="#proof">Why it works</a><button className="landing-settings" onClick={onSettings} aria-label="Accessibility and language settings" title="Accessibility & language (Alt+S)">⚙</button>{user ? <button className="button button-ghost" onClick={onEnter}>Welcome, {user.displayName.split(" ")[0]}</button> : <a className="button button-ghost" href={signInPath}>Sign in</a>}{user ? <button className="button button-dark" onClick={onEnter}>Open workspace <span>↗</span></button> : <a className="button button-dark" href={signInPath}>Create account <span>↗</span></a>}</div>
      </nav>
      <section id="top" className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><i /> Built for the role you actually want</span>
          <h1>Your experience is strong.<br /><em>Make the evidence impossible to miss.</em></h1>
          <p>Turn any job description into a focused preparation plan — with candidate analysis, realistic interview coaching and a reusable bank of your strongest proof points.</p>
          <div className="hero-actions">{user ? <button className="button button-primary button-large" onClick={onEnter}>Open my prep plan <span>→</span></button> : <a className="button button-primary button-large" href={signInPath}>Create my account <span>→</span></a>}<span className="microcopy">Private workspace · No Gmail connection · No credit card</span></div>
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
      <footer className="landing-footer"><a className="brand" href="#top"><BrandMark /><span>MockMate</span></a><p>Evidence wins interviews.</p>{user ? <button className="text-button" onClick={onEnter}>Open private workspace →</button> : <a className="text-button" href={signInPath}>Create account or sign in →</a>}</footer>
    </main>
  );
}

export function MockMateApp({ user, signInPath, signOutPath }: { user: MockMateUser | null; signInPath: string; signOutPath: string }) {
  const [entered, setEntered] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>(() => recalibrateWorkspace(createBlankWorkspace()));
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "offline">("loading");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileNav, setMobileNav] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [announcement, setAnnouncement] = useState("");
  const [aiStatus, setAIStatus] = useState<AIStatus | null>(null);
  const firstSave = useRef(true);
  const preferencesLoaded = useRef(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("mockmate-theme");
    if (savedTheme === "dark") queueMicrotask(() => setTheme("dark"));
    const savedPreferences = readPreferences(localStorage.getItem(PREFERENCES_STORAGE_KEY));
    queueMicrotask(() => { preferencesLoaded.current = true; setPreferences(savedPreferences); });
    if (!user) return;
    fetch("/api/workspace")
      .then((response) => response.json())
      .then((payload) => { const data = payload as { workspace?: Workspace | null; persistence?: string }; setWorkspace(data.workspace?.version === 1 ? recalibrateWorkspace(data.workspace) : recalibrateWorkspace(createBlankWorkspace())); setSaveState(data.persistence === "unavailable" ? "offline" : "saved"); })
      .catch(() => setSaveState("offline"))
      .finally(() => setLoaded(true));
  }, [user]);

  useEffect(() => {
    getAIStatus().then(setAIStatus).catch(() => setAIStatus({ configured: false, model: AI_SERVICE_CONFIG.model, provider: "deterministic-fallback" }));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("mockmate-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = preferences.textSize;
    root.dataset.contrast = preferences.highContrast ? "high" : "standard";
    root.dataset.reduceMotion = preferences.reduceMotion ? "true" : "false";
    root.dataset.dyslexiaFont = preferences.dyslexiaFont ? "true" : "false";
    root.dataset.enhancedFocus = preferences.enhancedFocus ? "true" : "false";
    if (preferencesLoaded.current) localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const openSettings = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "s") { event.preventDefault(); setSettingsOpen(true); }
    };
    document.addEventListener("keydown", openSettings);
    return () => document.removeEventListener("keydown", openSettings);
  }, []);

  useEffect(() => {
    if (!user || !loaded) return;
    if (firstSave.current) firstSave.current = false;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      fetch("/api/workspace", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(workspace) })
        .then((response) => { if (!response.ok) throw new Error("save failed"); setSaveState("saved"); })
        .catch(() => setSaveState("offline"));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [workspace, loaded, user]);

  const activeJob = workspace.jobs.find((job) => job.id === workspace.activeJobId) ?? workspace.jobs[0];
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const updateActiveJob = useCallback((update: Partial<Job> | ((job: Job) => Job)) => {
    setWorkspace((current) => ({
      ...current,
      jobs: current.jobs.map((job) => job.id === current.activeJobId
        ? typeof update === "function" ? update(job) : { ...job, ...update, updatedAt: new Date().toISOString() }
        : job),
    }));
  }, []);

  function setStage(stage: StageId) {
    updateActiveJob({ activeStage: stage });
    setMobileNav(false);
    if (preferences.verboseAnnouncements) setAnnouncement(`Stage ${stage}: ${STAGES.find((item) => item.id === stage)?.label}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addJob() {
    const job = createBlankJob();
    setWorkspace((current) => ({ ...current, activeJobId: job.id, jobs: [...current.jobs, job] }));
    setStage(1);
  }

  if (!entered) return <><a className="skip-link" href="#top">Skip to main content</a><Landing user={user} signInPath={signInPath} onEnter={() => setEntered(true)} onSettings={() => setSettingsOpen(true)} /><SettingsDialog open={settingsOpen} preferences={preferences} onChange={setPreferences} onClose={closeSettings} /></>;

  const stageComplete = (stage: StageId) => {
    if (stage === 1) return Boolean(activeJob.title && activeJob.description && activeJob.resume);
    if (stage === 2) return Boolean(activeJob.analysis);
    if (stage === 3) return Object.keys(activeJob.interviewAnswers).length > 0;
    if (stage === 4) return activeJob.quizAttempts.length > 0 || (activeJob.terminologyQuizAttempts?.length ?? 0) > 0;
    if (stage === 5) return workspace.evidenceItems.length > 0;
    return false;
  };
  const completedStages = STAGES.slice(0, 5).filter((stage) => stageComplete(stage.id)).length;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-workspace">Skip to preparation content</a>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <aside className={mobileNav ? "sidebar open" : "sidebar"}>
        <div className="sidebar-top"><button className="brand brand-button" onClick={() => setEntered(false)}><BrandMark /><span>MockMate</span></button><button className="mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation">×</button></div>
        <div className="workspace-label">PREP WORKSPACE</div>
        <nav className="stage-nav" aria-label="Preparation stages">
          {STAGES.map((stage) => <button key={stage.id} className={activeJob.activeStage === stage.id ? "active" : ""} onClick={() => setStage(stage.id)} aria-current={activeJob.activeStage === stage.id ? "step" : undefined}><span className={stageComplete(stage.id) ? "complete" : ""}>{stageComplete(stage.id) ? "✓" : stage.id}<i className="sr-only">{stageComplete(stage.id) ? "Complete" : "Not complete"}</i></span><div><b>{stage.label}</b><small>{stage.id === 1 ? "Target & profile" : stage.id === 2 ? "Fit & gaps" : stage.id === 3 ? "Practise & coach" : stage.id === 4 ? "Study terms & test" : stage.id === 5 ? "Your proof points" : "Readiness at a glance"}</small></div></button>)}
        </nav>
        <div className="sidebar-card"><span>✦</span><div><b>Prep momentum</b><p>{Math.round((completedStages / 5) * 100)}% of your plan is verified</p><div><i style={{ width: `${Math.round((completedStages / 5) * 100)}%` }} /></div></div></div>
        <div className="sidebar-foot"><a href={signOutPath} title="Sign out of MockMate"><span className="avatar">{user?.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "MM"}</span><div><b>{user?.displayName || "MockMate user"}</b><small>{user?.email || "Private account"}</small></div><i>Sign out</i></a></div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation">☰</button>
          <div className="job-switcher"><span className="job-dot" /><select value={activeJob.id} onChange={(event) => setWorkspace((current) => ({ ...current, activeJobId: event.target.value }))} aria-label="Current job">{workspace.jobs.map((job) => <option key={job.id} value={job.id}>{job.title || "Untitled role"}{job.company ? ` · ${job.company}` : ""}</option>)}</select><button onClick={addJob} title="Add another job" aria-label="Add another job">＋</button></div>
          <div className="header-actions"><span className={aiStatus?.configured ? "ai-status ready" : "ai-status fallback"} title={aiStatus?.configured ? `OpenAI ${aiStatus.model} is active` : "Deterministic scoring remains available until an AI key is connected"}><i />{aiStatus?.configured ? "AI ready" : "Smart fallback"}</span><span className={`save-status ${saveState}`} role="status"><i />{saveState === "loading" ? "Loading" : saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Preview mode"}</span><button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`} aria-pressed={theme === "dark"}><span aria-hidden="true">{theme === "light" ? "☼" : "☾"}</span></button><button className="settings-button" onClick={() => setSettingsOpen(true)} aria-label="Open accessibility and language settings" title="Accessibility & language (Alt+S)"><span aria-hidden="true">⚙</span></button><button className="help-button" aria-label="Help">?</button></div>
        </header>
        <main className="workspace-main" id="main-workspace" tabIndex={-1}>
          <div className="stage-kicker">STAGE {activeJob.activeStage} OF 6</div>
          <WorkflowStatus job={activeJob} completed={completedStages} aiStatus={aiStatus} />
          {activeJob.activeStage === 1 && <RoleDocuments key={activeJob.id} job={activeJob} templates={workspace.templates} resumeLibrary={workspace.resumeLibrary} coverLetterLibrary={workspace.coverLetterLibrary} updateJob={updateActiveJob} updateTemplates={(templates) => setWorkspace((current) => ({ ...current, templates }))} updateResumeLibrary={(resumeLibrary) => setWorkspace((current) => ({ ...current, resumeLibrary }))} updateCoverLetterLibrary={(coverLetterLibrary) => setWorkspace((current) => ({ ...current, coverLetterLibrary }))} onAnalyse={() => setStage(2)} />}
          {activeJob.activeStage === 2 && <CandidateAnalysis job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(3)} />}
          {activeJob.activeStage === 3 && <MockInterview job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(4)} preferences={preferences} announce={setAnnouncement} />}
          {activeJob.activeStage === 4 && <KnowledgeLab job={activeJob} updateJob={updateActiveJob} onNext={() => setStage(5)} />}
          {activeJob.activeStage === 5 && <EvidenceBank job={activeJob} items={workspace.evidenceItems} updateItems={(evidenceItems) => setWorkspace((current) => ({ ...current, evidenceItems }))} onNext={() => setStage(6)} />}
          {activeJob.activeStage === 6 && <Dashboard job={activeJob} evidenceItems={workspace.evidenceItems} onReviewGaps={() => setStage(2)} />}
        </main>
      </div>
      <SettingsDialog open={settingsOpen} preferences={preferences} onChange={setPreferences} onClose={closeSettings} />
    </div>
  );
}

function StageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="stage-heading"><div>{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function RoleDocuments({ job, templates, resumeLibrary, coverLetterLibrary, updateJob, updateTemplates, updateResumeLibrary, updateCoverLetterLibrary, onAnalyse }: { job: Job; templates: ProfileTemplate[]; resumeLibrary: SavedResume[]; coverLetterLibrary: SavedCoverLetter[]; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; updateTemplates: (templates: ProfileTemplate[]) => void; updateResumeLibrary: (items: SavedResume[]) => void; updateCoverLetterLibrary: (items: SavedCoverLetter[]) => void; onAnalyse: () => void }) {
  const [uploading, setUploading] = useState<"resume" | "cover" | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [templateName, setTemplateName] = useState(templates.find((item) => item.id === job.templateId)?.name ?? "");
  const [showTemplates, setShowTemplates] = useState(false);
  const selectedResume = resumeLibrary.find((item) => item.id === job.resumeLibraryId) ?? null;
  const selectedCoverLetter = coverLetterLibrary.find((item) => item.id === job.coverLetterLibraryId) ?? null;
  const [resumeName, setResumeName] = useState(selectedResume?.name ?? documentDisplayName(job.resume?.filename ?? ""));
  const [coverLetterName, setCoverLetterName] = useState(selectedCoverLetter?.name ?? documentDisplayName(job.coverLetterDocument?.filename ?? ""));
  const canAnalyse = Boolean(job.title.trim() && job.description.trim() && job.resume?.extractedText);
  const roleLinks = Array.isArray(job.roleLinks) && job.roleLinks.length ? job.roleLinks : [""];

  function updateRoleLink(index: number, value: string) {
    const next = [...roleLinks];
    next[index] = value;
    updateJob({ roleLinks: next });
  }

  function attachDocument(document: NonNullable<Job["resume"]>, kind: "resume" | "cover") {
    const now = new Date().toISOString();
    if (kind === "resume") {
      const existing = resumeLibrary.find((item) => item.document.id === document.id);
      const item: SavedResume = existing ?? { id: makeId(), name: documentDisplayName(document.filename) || "Saved resume", document, updatedAt: now };
      updateResumeLibrary(existing ? resumeLibrary.map((candidate) => candidate.id === existing.id ? { ...candidate, document, updatedAt: now } : candidate) : [...resumeLibrary, item]);
      updateJob({ resume: document, resumeLibraryId: item.id, templateId: null });
      setResumeName(item.name);
      return;
    }
    const text = document.extractedText || job.coverLetterText;
    const existing = coverLetterLibrary.find((item) => item.document?.id === document.id);
    const item: SavedCoverLetter = existing ?? { id: makeId(), name: documentDisplayName(document.filename) || "Saved cover letter", document, text, updatedAt: now };
    updateCoverLetterLibrary(existing ? coverLetterLibrary.map((candidate) => candidate.id === existing.id ? { ...candidate, document, text, updatedAt: now } : candidate) : [...coverLetterLibrary, item]);
    updateJob({ coverLetterDocument: document, coverLetterText: text, coverLetterLibraryId: item.id, templateId: null });
    setCoverLetterName(item.name);
  }

  async function upload(file: File, kind: "resume" | "cover") {
    setUploading(kind); setUploadError("");
    const form = new FormData(); form.append("file", file); form.append("kind", kind === "cover" ? "cover-letter" : "resume"); form.append("jobId", job.id);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json() as { error?: string; document?: Job["resume"] };
      if (!response.ok) throw new Error(data.error || "Upload failed");
      if (!data.document) throw new Error("The document response was incomplete");
      attachDocument(data.document, kind);
    } catch (error) {
      if (["text/plain", "text/markdown"].includes(file.type) || /\.(txt|md)$/i.test(file.name)) {
        const text = await file.text();
        const document = { id: makeId(), filename: file.name, contentType: file.type || "text/plain", storageKey: "local-preview", extractedText: text, characterCount: text.length, status: "extracted" as const };
        attachDocument(document, kind);
        setUploadError("Stored in this preview session; hosted document storage will retain the original.");
      } else setUploadError(error instanceof Error ? error.message : "Could not process that document");
    } finally { setUploading(null); }
  }

  function loadExample() {
    const document = { id: makeId(), filename: "Example_Product_Resume.txt", contentType: "text/plain", storageKey: "example", extractedText: SAMPLE_RESUME, characterCount: SAMPLE_RESUME.length, status: "extracted" as const };
    const item: SavedResume = { id: makeId(), name: "Product leadership — example", document, updatedAt: new Date().toISOString() };
    updateResumeLibrary([...resumeLibrary, item]);
    updateJob({
      title: "Senior Product Manager, AI", company: "Lumon Labs", description: SAMPLE_JOB_DESCRIPTION,
      resume: document, resumeLibraryId: item.id, templateId: null,
    });
    setResumeName(item.name);
  }

  function chooseResume(resumeId: string) {
    const saved = resumeLibrary.find((item) => item.id === resumeId);
    if (!saved) { updateJob({ resumeLibraryId: null, templateId: null }); return; }
    setResumeName(saved.name);
    updateJob({ resume: saved.document, resumeLibraryId: saved.id, templateId: null });
  }

  function chooseCoverLetter(coverLetterId: string) {
    const saved = coverLetterLibrary.find((item) => item.id === coverLetterId);
    if (!saved) { updateJob({ coverLetterLibraryId: null, templateId: null }); return; }
    setCoverLetterName(saved.name);
    updateJob({ coverLetterDocument: saved.document, coverLetterText: saved.text, coverLetterLibraryId: saved.id, templateId: null });
  }

  function saveResume() {
    if (!job.resume) return;
    const now = new Date().toISOString();
    const name = resumeName.trim() || documentDisplayName(job.resume.filename) || "Saved resume";
    const existing = resumeLibrary.find((item) => item.id === job.resumeLibraryId);
    const item: SavedResume = { id: existing?.id ?? makeId(), name, document: job.resume, updatedAt: now };
    updateResumeLibrary(existing ? resumeLibrary.map((candidate) => candidate.id === item.id ? item : candidate) : [...resumeLibrary, item]);
    updateJob({ resumeLibraryId: item.id });
    setResumeName(name);
  }

  function saveCoverLetter() {
    if (!job.coverLetterDocument && !job.coverLetterText.trim()) return;
    const now = new Date().toISOString();
    const name = coverLetterName.trim() || documentDisplayName(job.coverLetterDocument?.filename ?? "") || "Saved cover letter";
    const existing = coverLetterLibrary.find((item) => item.id === job.coverLetterLibraryId);
    const item: SavedCoverLetter = { id: existing?.id ?? makeId(), name, document: job.coverLetterDocument, text: job.coverLetterText, updatedAt: now };
    updateCoverLetterLibrary(existing ? coverLetterLibrary.map((candidate) => candidate.id === item.id ? item : candidate) : [...coverLetterLibrary, item]);
    updateJob({ coverLetterLibraryId: item.id });
    setCoverLetterName(name);
  }

  function removeSavedResume() {
    if (!job.resumeLibraryId) return;
    const resumeId = job.resumeLibraryId;
    updateResumeLibrary(resumeLibrary.filter((item) => item.id !== resumeId));
    updateTemplates(templates.map((template) => template.resumeLibraryId === resumeId ? { ...template, resumeLibraryId: null } : template));
    updateJob({ resumeLibraryId: null, templateId: null });
  }

  function removeSavedCoverLetter() {
    if (!job.coverLetterLibraryId) return;
    const coverLetterId = job.coverLetterLibraryId;
    updateCoverLetterLibrary(coverLetterLibrary.filter((item) => item.id !== coverLetterId));
    updateTemplates(templates.map((template) => template.coverLetterLibraryId === coverLetterId ? { ...template, coverLetterLibraryId: null } : template));
    updateJob({ coverLetterLibraryId: null, templateId: null });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) { updateJob({ templateId: null }); return; }
    setTemplateName(template.name);
    setResumeName(resumeLibrary.find((item) => item.id === template.resumeLibraryId)?.name ?? documentDisplayName(template.resume?.filename ?? ""));
    setCoverLetterName(coverLetterLibrary.find((item) => item.id === template.coverLetterLibraryId)?.name ?? documentDisplayName(template.coverLetterDocument?.filename ?? ""));
    updateJob({ templateId, resumeLibraryId: template.resumeLibraryId, coverLetterLibraryId: template.coverLetterLibraryId, resume: template.resume, coverLetterDocument: template.coverLetterDocument, coverLetterText: template.coverLetterText, portfolioUrl: template.portfolioUrl, linkedinUrl: template.linkedinUrl });
  }

  function saveTemplate() {
    const name = templateName.trim() || `${job.title || "General"} application kit`;
    const existing = templates.find((item) => item.id === job.templateId);
    const template: ProfileTemplate = { id: existing?.id ?? makeId(), name, resumeLibraryId: job.resumeLibraryId, coverLetterLibraryId: job.coverLetterLibraryId, resume: job.resume, coverLetterDocument: job.coverLetterDocument, coverLetterText: job.coverLetterText, portfolioUrl: job.portfolioUrl, linkedinUrl: job.linkedinUrl, updatedAt: new Date().toISOString() };
    updateTemplates(existing ? templates.map((item) => item.id === existing.id ? template : item) : [...templates, template]);
    updateJob({ templateId: template.id }); setTemplateName(name); setShowTemplates(false);
  }

  function deleteTemplate() {
    if (!job.templateId) return;
    updateTemplates(templates.filter((template) => template.id !== job.templateId));
    updateJob({ templateId: null });
    setTemplateName("");
    setShowTemplates(false);
  }

  async function runAnalysis() {
    if (!canAnalyse) return;
    setAnalysing(true); setAnalysisMessage("");
    try {
      const { result } = await requestAI<AnalysisResult>("analyse", { job });
      updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }], interviewQuestions: [], activeStage: 2 });
      onAnalyse();
    } catch {
      const result = analyseCandidate(job);
      updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }], interviewQuestions: [], activeStage: 2 });
      setAnalysisMessage("The model could not be reached, so MockMate used its verified rubric fallback.");
      onAnalyse();
    } finally { setAnalysing(false); }
  }

  return <>
    <StageHeading title="Start with the role." description="Choose the best resume and cover letter for this role. Save each document once, then mix and match them or keep an optional pairing." action={<button className="button button-soft" onClick={loadExample}>↗ Load example</button>} />
    <div className="template-bar"><div><span className="template-icon">✦</span><div><b>Application kit <span className="optional-pill">Optional</span></b><small>Pair a resume and cover letter you often use together</small></div></div><select value={job.templateId ?? ""} onChange={(event) => applyTemplate(event.target.value)} aria-label="Application kit"><option value="">Mix & match — no saved kit</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="text-button" onClick={() => setShowTemplates(!showTemplates)}>{showTemplates ? "Close" : "Manage kits"}</button></div>
    {showTemplates && <div className="template-editor"><div><label>Kit name<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="e.g. Product roles — AI" /></label><button className="button button-dark" disabled={!job.resume} onClick={saveTemplate}>{job.templateId ? "Update kit" : "Save as kit"}</button></div><div className="kit-summary"><span><b>Resume</b>{selectedResume?.name ?? (job.resume ? documentDisplayName(job.resume.filename) : "None selected")}</span><i>＋</i><span><b>Cover letter</b>{selectedCoverLetter?.name ?? (job.coverLetterText ? "One-off cover letter" : "No cover letter")}</span></div><div className="template-editor-actions"><p>A kit is only a shortcut. You can still tailor either document for a specific job.</p><div>{job.templateId && <button className="text-button danger-text" onClick={deleteTemplate}>Delete kit</button>}<button className="text-button" onClick={() => { updateJob({ templateId: null }); setTemplateName(""); }}>＋ New kit</button></div></div></div>}
    <section className="form-card">
      <div className="section-label"><span>01</span><div><h2>Target role</h2><p>The source of truth for every question and recommendation.</p></div></div>
      <div className="field-grid two"><label>Job title <span>Required</span><input value={job.title} onChange={(event) => updateJob({ title: event.target.value })} placeholder="e.g. Senior Product Manager" /></label><label>Company <span>Optional</span><input value={job.company} onChange={(event) => updateJob({ company: event.target.value })} placeholder="e.g. Lumon Labs" /></label></div>
      <div className="role-links-field"><div className="role-links-head"><div><b>Role &amp; company links <span>Optional</span></b><small>Add the job post, company website, LinkedIn company page or another useful public source.</small></div><button type="button" className="text-button" disabled={roleLinks.length >= 5} onClick={() => updateJob({ roleLinks: [...roleLinks, ""] })}>＋ Add link</button></div><div className="role-link-list">{roleLinks.map((link, index) => <div key={index}><input type="url" inputMode="url" value={link} onChange={(event) => updateRoleLink(index, event.target.value)} placeholder={index === 0 ? "https://company.com/careers/role" : "https://linkedin.com/company/…"} aria-label={`Role or company source link ${index + 1}`} />{roleLinks.length > 1 && <button type="button" onClick={() => updateJob({ roleLinks: roleLinks.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove source link ${index + 1}`}>×</button>}</div>)}</div><small className="role-links-note">The AI uses these sources for employer context. Candidate documents are never used as web-search queries.</small></div>
      <label>Job description <span>Required</span><textarea className="jd-textarea" value={job.description} onChange={(event) => updateJob({ description: event.target.value })} placeholder="Paste the complete job description here…" /><small className="field-meta">{job.description.length.toLocaleString()} characters</small></label>
    </section>
    <section className="form-card">
      <div className="section-label"><span>02</span><div><h2>Your application documents</h2><p>Saved resumes and cover letters stay independent. Pair them only when it saves you time.</p></div></div>
      <div className="document-library-head"><div><span className="overline">YOUR LIBRARY</span><h3>Pick, name and reuse</h3></div><p>{resumeLibrary.length} resume{resumeLibrary.length === 1 ? "" : "s"} · {coverLetterLibrary.length} cover letter{coverLetterLibrary.length === 1 ? "" : "s"}</p></div>
      <div className="document-library-grid">
        <article className="library-card">
          <div className="library-card-title"><span>R</span><div><b>Resume library</b><small>Choose the version that fits this role</small></div></div>
          <label>Saved resume<select value={job.resumeLibraryId ?? ""} onChange={(event) => chooseResume(event.target.value)}><option value="">Current one-off resume</option>{resumeLibrary.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="library-name-row"><label>Name this resume<input value={resumeName} onChange={(event) => setResumeName(event.target.value)} placeholder="e.g. Product manager — AI" /></label><button className="button button-soft" disabled={!job.resume} onClick={saveResume}>{selectedResume ? "Update" : "Save"}</button></div>
          <div className="library-card-actions"><label className="text-button upload-another">＋ Upload another<input type="file" accept=".pdf,.docx,.txt,.md,.rtf,.pptx" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "resume")} /></label>{selectedResume && <button className="text-button danger-text" onClick={removeSavedResume}>Remove from library</button>}</div>
        </article>
        <article className="library-card">
          <div className="library-card-title"><span>C</span><div><b>Cover-letter library</b><small>Optional and reusable independently</small></div></div>
          <label>Saved cover letter<select value={job.coverLetterLibraryId ?? ""} onChange={(event) => chooseCoverLetter(event.target.value)}><option value="">Current one-off cover letter</option>{coverLetterLibrary.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className="library-name-row"><label>Name this cover letter<input value={coverLetterName} onChange={(event) => setCoverLetterName(event.target.value)} placeholder="e.g. SaaS leadership base" /></label><button className="button button-soft" disabled={!job.coverLetterDocument && !job.coverLetterText.trim()} onClick={saveCoverLetter}>{selectedCoverLetter ? "Update" : "Save"}</button></div>
          <div className="library-card-actions"><label className="text-button upload-another">＋ Upload another<input type="file" accept=".pdf,.docx,.txt,.md,.rtf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "cover")} /></label>{selectedCoverLetter && <button className="text-button danger-text" onClick={removeSavedCoverLetter}>Remove from library</button>}</div>
        </article>
      </div>
      <div className="upload-grid">
        <div className="upload-block"><div className="field-label">Resume in use <span>Required</span></div>{job.resume ? <div className="file-card"><span className="file-type">{job.resume.filename.split(".").pop()?.toUpperCase()}</span><div><b>{selectedResume?.name ?? job.resume.filename}</b><small><i /> {job.resume.status === "extracted" ? `${job.resume.filename} · ${job.resume.characterCount.toLocaleString()} characters` : "Original stored · extraction unavailable"}</small></div><button onClick={() => updateJob({ resume: null, resumeLibraryId: null, templateId: null })} aria-label="Remove resume from this job">×</button></div> : <label className="dropzone"><input type="file" accept=".pdf,.docx,.txt,.md,.rtf,.pptx" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "resume")} /><span>{uploading === "resume" ? "…" : "↑"}</span><b>{uploading === "resume" ? "Extracting document" : "Drop resume or choose a file"}</b><small>PDF, DOCX, TXT, MD, RTF or PPTX · max 12 MB</small></label>}</div>
        <div className="upload-block"><div className="field-label">Cover letter in use <span>Optional</span></div>{job.coverLetterDocument ? <div className="file-card"><span className="file-type">{job.coverLetterDocument.filename.split(".").pop()?.toUpperCase()}</span><div><b>{selectedCoverLetter?.name ?? job.coverLetterDocument.filename}</b><small><i /> {job.coverLetterDocument.filename} · {job.coverLetterDocument.characterCount.toLocaleString()} characters</small></div><button onClick={() => updateJob({ coverLetterDocument: null, coverLetterLibraryId: null, templateId: null })} aria-label="Remove cover-letter file from this job">×</button></div> : <label className="dropzone compact"><input type="file" accept=".pdf,.docx,.txt,.md,.rtf" onChange={(event) => event.target.files?.[0] && upload(event.target.files[0], "cover")} /><span>{uploading === "cover" ? "…" : "↑"}</span><b>{uploading === "cover" ? "Extracting document" : "Upload cover letter"}</b><small>Or paste and save the text below</small></label>}</div>
      </div>
      {uploadError && <p className="inline-alert">{uploadError}</p>}
      <label>Cover letter text <span>Optional</span><textarea value={job.coverLetterText} onChange={(event) => updateJob({ coverLetterText: event.target.value, templateId: null })} placeholder="Paste or tailor your cover letter, then name and save it above…" /></label>
      <div className="field-grid two"><label>Portfolio URL <span>Optional</span><input type="url" value={job.portfolioUrl} onChange={(event) => updateJob({ portfolioUrl: event.target.value })} placeholder="https://yourportfolio.com" /></label><label>LinkedIn profile <span>Optional</span><input type="url" value={job.linkedinUrl} onChange={(event) => updateJob({ linkedinUrl: event.target.value })} placeholder="https://linkedin.com/in/…" /></label></div>
    </section>
    {analysisMessage && <p className="inline-alert" role="status">{analysisMessage}</p>}
    <div className="sticky-action"><div><b>{analysing ? "AI is mapping your evidence." : canAnalyse ? "Everything is ready." : "Add the role, description and resume to continue."}</b><small>Semantic AI analysis is anchored to a versioned evidence rubric, with a deterministic fallback.</small></div><button className="button button-primary button-large" disabled={!canAnalyse || analysing} onClick={() => void runAnalysis()}>{analysing ? "Analysing evidence…" : "Analyse candidate against role"} <span>{analysing ? "✦" : "→"}</span></button></div>
  </>;
}

function CandidateAnalysis({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const [requirement, setRequirement] = useState("");
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const analysis = job.analysis ?? analyseCandidate(job);
  const fallbackAnalysis = useMemo(() => analyseCandidate(job), [job]);
  const companyResearch = analysis.companyResearch ?? fallbackAnalysis.companyResearch;
  const preparationPlan = analysis.preparationPlan?.length ? analysis.preparationPlan : fallbackAnalysis.preparationPlan;
  async function reanalyse() {
    setAnalysing(true);
    try {
      const { result } = await requestAI<AnalysisResult>("analyse", { job });
      updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }], ...(Object.keys(job.interviewAnswers).length ? {} : { interviewQuestions: [] }) });
    } catch {
      const result = analyseCandidate(job);
      updateJob({ analysis: result, analysisHistory: [...job.analysisHistory, { score: result.alignmentScore, at: result.createdAt }] });
    } finally { setAnalysing(false); }
  }
  function updateRequirements(requirements: typeof analysis.requirements) { updateJob({ analysis: { ...analysis, requirements, gaps: requirements.filter((item) => !item.covered).map((item) => item.label) } }); }
  return <>
    <StageHeading eyebrow="ANALYSIS COMPLETE" title={analysis.alignmentScore >= 80 ? "You’re a strong match." : analysis.alignmentScore >= 65 ? "You’re a promising match." : "You have a focused path forward."} description={`${analysis.evidenceFound.length} proof point${analysis.evidenceFound.length === 1 ? "" : "s"} verified against the role, with ${analysis.gaps.length} gap${analysis.gaps.length === 1 ? "" : "s"} worth preparing.`} action={<button className="button button-soft" disabled={analysing} onClick={() => void reanalyse()}>{analysing ? "✦ Analysing…" : "↻ Re-analyse"}</button>} />
    <div className="score-grid">
      <section className="score-card primary-score"><div className="score-ring" style={{ "--score": analysis.alignmentScore } as CSSProperties}><div><strong>{analysis.alignmentScore}</strong><span>/ 100</span></div></div><div><span className="overline">COMPETITIVE FIT ESTIMATE</span><h2>{analysis.alignmentScore >= 80 ? "Strong match" : analysis.alignmentScore >= 65 ? "Promising match" : "Developing match"}</h2><p>{analysis.fitSummary || fallbackAnalysis.fitSummary}</p><small>Evidence fit, not a guaranteed hiring probability · Rubric {analysis.rubricVersion}</small><AIProvenanceBadge value={analysis.provenance} /></div></section>
      <section className="score-card reputation-card"><div className="empty-score">—</div><div><span className="overline">LINKEDIN EVIDENCE</span><h2>{analysis.reputationScore ?? "Not available"}</h2><p>{analysis.reputationScore ? `Based on the LinkedIn evidence you supplied${(job.linkedinDocuments ?? []).length ? ` across ${(job.linkedinDocuments ?? []).length} file${(job.linkedinDocuments ?? []).length === 1 ? "" : "s"}` : ""}.` : "Add your own export—MockMate never scrapes LinkedIn or invents activity."}</p><button className="text-button" onClick={() => setShowLinkedIn(!showLinkedIn)} aria-expanded={showLinkedIn}>{showLinkedIn ? "Close LinkedIn evidence" : "Attach LinkedIn evidence →"}</button></div></section>
    </div>
    {showLinkedIn && <LinkedInEvidencePanel job={job} updateJob={updateJob} onReanalyse={() => { void reanalyse(); }} />}
    <div className="research-prep-grid">
      <section className="panel company-brief"><div className="panel-head"><div><span className="overline">COMPANY BRIEF</span><h2>{job.company || "Company context"}</h2></div><span className={`research-status ${companyResearch.status}`}>{companyResearch.status === "researched" ? "Current web research" : companyResearch.status === "links-only" ? "Links supplied" : "Needs a source"}</span></div><p className="company-overview">{companyResearch.overview}</p><div className="role-context"><small>WHY THIS ROLE MATTERS</small><p>{companyResearch.roleContext}</p></div>{companyResearch.signals.length > 0 && <div className="company-signals">{companyResearch.signals.map((signal) => <span key={signal}>{signal}</span>)}</div>}{companyResearch.sources.length > 0 && <div className="research-sources"><small>SOURCES</small>{companyResearch.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</div>}</section>
      <section className="panel preparation-panel"><div className="panel-head"><div><span className="overline">ROLE-SPECIFIC PREPARATION</span><h2>What to prepare next</h2></div><b>{preparationPlan.length}</b></div><div className="preparation-list">{preparationPlan.map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{item.title}</b><p>{item.action}</p><small>{item.reason}</small></div></article>)}</div></section>
    </div>
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

function LinkedInEvidencePanel({ job, updateJob, onReanalyse }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onReanalyse: () => void }) {
  const documents = job.linkedinDocuments ?? [];
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const available = Math.max(0, 4 - documents.length);
    if (!available) { setMessage("Remove a LinkedIn file before adding another. Up to four exports can be attached."); return; }
    const selected = Array.from(fileList).slice(0, available);
    let nextDocuments = [...documents];
    setUploading(true); setMessage("");
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", /\.pdf$/i.test(file.name) ? "linkedin-profile" : "linkedin-activity");
        form.append("jobId", job.id);
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const data = await response.json() as { error?: string; document?: Job["linkedinDocuments"][number] };
        if (!response.ok || !data.document) throw new Error(data.error || `Could not import ${file.name}`);
        nextDocuments = [...nextDocuments, data.document];
        updateJob({ linkedinDocuments: nextDocuments });
      }
      const skipped = fileList.length - selected.length;
      setMessage(`${selected.length} LinkedIn file${selected.length === 1 ? "" : "s"} ready for analysis.${skipped > 0 ? ` ${skipped} skipped because the four-file limit was reached.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not import that LinkedIn file");
    } finally {
      setUploading(false);
    }
  }

  async function removeDocument(document: Job["linkedinDocuments"][number]) {
    setMessage("");
    try {
      if (!document.storageKey.startsWith("local-")) {
        const response = await fetch(`/api/upload?documentId=${encodeURIComponent(document.id)}`, { method: "DELETE" });
        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error || "Could not remove that file");
      }
      updateJob({ linkedinDocuments: documents.filter((item) => item.id !== document.id) });
      setMessage(`${document.filename} removed from your private workspace.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove that file");
    }
  }

  return <section className="linkedin-panel" aria-labelledby="linkedin-evidence-title">
    <div className="linkedin-panel-head"><span aria-hidden="true">in</span><div><b id="linkedin-evidence-title">Use your LinkedIn data safely</b><p>Attach exports you downloaded yourself. MockMate extracts professional profile and activity evidence without scraping LinkedIn.</p></div></div>
    <div className="linkedin-import-grid">
      <label className="dropzone linkedin-dropzone">
        <input type="file" multiple accept=".pdf,.zip,.csv,.json,.txt,.md" disabled={uploading || documents.length >= 4} onChange={(event) => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }} />
        <span aria-hidden="true">{uploading ? "…" : "↑"}</span>
        <b>{uploading ? "Reading LinkedIn data" : "Attach profile or activity export"}</b>
        <small>PDF, ZIP, CSV, JSON or text · up to 50 MB</small>
      </label>
      <div className="linkedin-privacy"><b>Private by design</b><p>Your original is kept in private workspace storage. MockMate reads profile, posts, comments, reactions and related professional sections; it ignores messages, contacts, connections and search history.</p></div>
    </div>
    {documents.length > 0 && <div className="linkedin-document-list" aria-label="Attached LinkedIn files">{documents.map((document) => <div className="linkedin-file" key={document.id}><span className="file-type">{document.filename.split(".").pop()?.toUpperCase()}</span><div><b>{document.filename}</b><small><i /> {document.characterCount.toLocaleString()} characters ready</small></div><button type="button" onClick={() => void removeDocument(document)} aria-label={`Remove ${document.filename}`}>×</button></div>)}</div>}
    {message && <p className="linkedin-message" role="status">{message}</p>}
    <details className="linkedin-guide">
      <summary>How do I get my LinkedIn files?</summary>
      <div className="linkedin-guide-steps">
        <div><span>01</span><p><b>Profile PDF</b>On LinkedIn desktop: Me → View profile → More or Resources → Save to PDF.</p><a href="https://www.linkedin.com/help/linkedin/answer/a541960" target="_blank" rel="noreferrer">LinkedIn PDF instructions ↗</a></div>
        <div><span>02</span><p><b>Posts, comments and reactions</b>Settings & Privacy → Data privacy → Get a copy of your data. Choose Profile, Positions, Shares, Comments, Reactions and Articles, then request the archive.</p><a href="https://www.linkedin.com/help/linkedin/answer/a1339364" target="_blank" rel="noreferrer">LinkedIn data instructions ↗</a></div>
      </div>
      <p className="linkedin-wait-note">LinkedIn emails you when the download is ready. Activity categories can take up to 48 hours and the download link is time-limited.</p>
    </details>
    <label className="linkedin-paste-label">Paste profile or activity text <span>Optional</span><textarea value={job.linkedinProfileText} onChange={(event) => updateJob({ linkedinProfileText: event.target.value })} placeholder="Paste your headline, About section, experience, posts or comments…" /></label>
    <div className="linkedin-actions"><small>Only evidence you provide is analysed.</small><button className="button button-dark" onClick={onReanalyse}>Use evidence & re-analyse</button></div>
  </section>;
}

function MockInterview({ job, updateJob, onNext, preferences, announce }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void; preferences: AppPreferences; announce: (message: string) => void }) {
  const generatedQuestions = useMemo(() => job.interviewQuestions?.length === 112 ? job.interviewQuestions : generateInterviewQuestions(job), [job]);
  const customQuestions = useMemo(() => job.customInterviewQuestions ?? [], [job.customInterviewQuestions]);
  const questions = useMemo(() => [...generatedQuestions, ...customQuestions].map((item, index) => ({ ...item, number: index + 1 })), [generatedQuestions, customQuestions]);
  const requestedQuestions = useRef("");
  const questionState = job.interviewQuestions?.length === 112 ? "ready" : "loading";
  const [coaching, setCoaching] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customError, setCustomError] = useState("");
  const [page, setPage] = useState(0); const [selected, setSelected] = useState(0); const [listOpen, setListOpen] = useState(true);
  const pageQuestions = questions.slice(page * 14, page * 14 + 14); const question = questions[selected]; const answer = job.interviewAnswers[question.id] ?? { text: "", mode: "writing" as const, updatedAt: new Date().toISOString() };
  const attempted = Object.values(job.interviewAnswers).filter((item) => item.text.trim()).length;
  function saveAnswer(next: InterviewAnswer) { updateJob({ interviewAnswers: { ...job.interviewAnswers, [question.id]: next } }); }
  useEffect(() => {
    if (job.interviewQuestions?.length === 112) return;
    const requestKey = `${job.id}-${job.analysis?.id ?? "unanalysed"}`;
    if (requestedQuestions.current === requestKey) return;
    requestedQuestions.current = requestKey;
    let cancelled = false;
    const questionJob = { id: job.id, title: job.title, company: job.company, description: job.description, analysis: job.analysis };
    requestAI<InterviewQuestion[]>("questions", { job: questionJob })
      .then(({ result }) => { if (!cancelled) updateJob({ interviewQuestions: result }); })
      .catch(() => { if (!cancelled) updateJob({ interviewQuestions: generateInterviewQuestions(questionJob) }); });
    return () => { cancelled = true; };
  }, [job.id, job.title, job.company, job.description, job.analysis, job.interviewQuestions?.length, updateJob]);
  function addCustomQuestion() {
    const prompt = customPrompt.replace(/\s+/g, " ").trim();
    if (prompt.length < 10) { setCustomError("Enter a complete interview question before adding it."); return; }
    if (customQuestions.some((item) => item.prompt.toLowerCase() === prompt.toLowerCase())) { setCustomError("That question is already in your list."); return; }
    const index = questions.length;
    const nextQuestion: InterviewQuestion = {
      id: `custom-q-${makeId()}`,
      number: index + 1,
      category: "Your question",
      prompt: prompt.slice(0, 500),
      focus: "the capability this question is testing",
    };
    updateJob({ customInterviewQuestions: [...customQuestions, nextQuestion] });
    setCustomPrompt(""); setCustomError(""); setSelected(index); setPage(Math.floor(index / 14));
    announce("Your interview question was added and is ready to practise.");
  }
  function removeCustomQuestion() {
    if (question.category !== "Your question") return;
    const interviewAnswers = Object.fromEntries(Object.entries(job.interviewAnswers).filter(([id]) => id !== question.id));
    updateJob({ customInterviewQuestions: customQuestions.filter((item) => item.id !== question.id), interviewAnswers });
    const nextIndex = Math.max(0, Math.min(selected - 1, questions.length - 2));
    setSelected(nextIndex); setPage(Math.floor(nextIndex / 14));
    announce("Your custom interview question was removed.");
  }
  async function coach() {
    if (!answer.text.trim() || coaching) return;
    setCoaching(true);
    try {
      const { result } = await requestAI<CoachResult>("coach", { answer: answer.text, question, job });
      saveAnswer({ ...answer, result, updatedAt: new Date().toISOString() });
      if (preferences.verboseAnnouncements) announce(`Coach score ${result.score} out of 100. ${result.critique[0]}`);
    } catch {
      const result = coachAnswer(answer.text, question, job);
      saveAnswer({ ...answer, result, updatedAt: new Date().toISOString() });
      if (preferences.verboseAnnouncements) announce(`Coach score ${result.score} out of 100. Verified fallback guidance was used.`);
    } finally { setCoaching(false); }
  }
  function speakQuestion() {
    if (!("speechSynthesis" in window)) { announce("Read aloud is not supported in this browser."); return; }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.prompt);
    utterance.lang = preferences.practiceLanguage;
    utterance.rate = preferences.speechRate;
    const preferredVoice = speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(preferences.practiceLanguage.toLowerCase().split("-")[0]));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onstart = () => announce("Reading the interview question aloud.");
    utterance.onend = () => announce("Question read aloud complete.");
    speechSynthesis.speak(utterance);
  }
  function selectQuestion(index: number) { setSelected(index); setPage(Math.floor(index / 14)); if (preferences.verboseAnnouncements) announce(`Question ${index + 1}: ${questions[index].prompt}`); if (window.innerWidth < 900) setListOpen(false); }
  return <>
    <StageHeading title="Practise the moments that matter." description={`${generatedQuestions.length} role questions${customQuestions.length ? ` plus ${customQuestions.length} of your own` : ""}, with coaching on every answer.`} action={<div className="stage-heading-actions"><AIProvenanceBadge value={generatedQuestions[0]?.provenance} /><div className="progress-stat"><strong>{attempted}</strong><span>of {questions.length}<small>{questionState === "loading" ? "personalising" : "attempted"}</small></span></div></div>} />
    <form className="custom-question-card" onSubmit={(event) => { event.preventDefault(); addCustomQuestion(); }}>
      <div className="custom-question-copy"><span className="overline">BRING YOUR OWN QUESTION</span><h2>Add something you want to rehearse.</h2><p>Paste a question from a recruiter, hiring manager or your own preparation list. It is saved with this role and uses the same answer coaching.</p></div>
      <div className="custom-question-entry"><label><span className="sr-only">Your interview question</span><textarea value={customPrompt} maxLength={500} onChange={(event) => { setCustomPrompt(event.target.value); if (customError) setCustomError(""); }} placeholder="e.g. Tell me about a time you influenced a difficult stakeholder without formal authority." /></label><button className="button button-dark" type="submit" disabled={!customPrompt.trim()}>＋ Add question</button></div>
      <div className="custom-question-status"><small>{customQuestions.length ? `${customQuestions.length} custom question${customQuestions.length === 1 ? "" : "s"} saved with this role` : "Your questions remain private in this workspace"}</small>{customError && <p role="alert">{customError}</p>}</div>
    </form>
    <div className="interview-shell">
      <aside className={listOpen ? "question-browser open" : "question-browser"} aria-label="Interview question list"><div className="question-browser-head"><div><span className="overline">QUESTION SET</span><b>{page * 14 + 1}–{Math.min(page * 14 + 14, questions.length)} of {questions.length}</b></div><button onClick={() => setListOpen(false)} aria-label="Close question list">×</button></div><div className="question-items">{pageQuestions.map((item, index) => { const absolute = page * 14 + index; const saved = job.interviewAnswers[item.id]; return <button key={item.id} className={selected === absolute ? "active" : ""} onClick={() => selectQuestion(absolute)} aria-current={selected === absolute ? "true" : undefined}><span>{saved?.result ? "✓" : item.number.toString().padStart(2, "0")}</span><div><small>{item.category}</small><p>{item.prompt}</p></div>{saved?.result && <b aria-label={`Coach score ${saved.result.score}`}>{saved.result.score}</b>}</button>; })}</div><div className="pagination"><button disabled={page === 0} onClick={() => { setPage(page - 1); setSelected((page - 1) * 14); }} aria-label="Previous 14 questions">←</button><span>{page + 1} / {Math.ceil(questions.length / 14)}</span><button disabled={page === Math.ceil(questions.length / 14) - 1} onClick={() => { setPage(page + 1); setSelected((page + 1) * 14); }} aria-label="Next 14 questions">→</button></div></aside>
      <section className="practice-panel" aria-labelledby="current-interview-question"><button className="question-list-toggle" onClick={() => setListOpen(!listOpen)} aria-expanded={listOpen}>☷ Question list</button><div className="question-meta"><span>{question.category}</span><span>Question {question.number} of {questions.length}</span></div><h2 id="current-interview-question">{question.prompt}</h2><div className="question-tools"><button className="read-button" onClick={speakQuestion}>◖ Read question aloud</button>{question.category === "Your question" && <button className="remove-custom-question" onClick={removeCustomQuestion}>Remove my question</button>}</div>
        <div className="answer-mode" role="group" aria-label="Answer mode"><button className={answer.mode === "writing" ? "active" : ""} aria-pressed={answer.mode === "writing"} onClick={() => saveAnswer({ ...answer, mode: "writing" })}>⌨ Writing</button><button className={answer.mode === "speaking" ? "active" : ""} aria-pressed={answer.mode === "speaking"} onClick={() => saveAnswer({ ...answer, mode: "speaking" })}>● Speaking</button></div>
        {answer.mode === "speaking" && <SpeechPractice answerText={answer.text} language={preferences.practiceLanguage} onTranscript={(text) => saveAnswer({ ...answer, text, result: undefined, mode: "speaking", updatedAt: new Date().toISOString() })} onAnnounce={(message) => { if (preferences.verboseAnnouncements) announce(message); }} />}
        <label className="answer-area"><span className="sr-only">Your interview answer</span><textarea value={answer.text} onChange={(event) => saveAnswer({ ...answer, text: event.target.value, result: undefined, updatedAt: new Date().toISOString() })} placeholder="Shape your answer with context, your specific actions, and a measurable result…" /><span aria-hidden="true">{answer.text.trim() ? answer.text.trim().split(/\s+/).length : 0} words · aim for 90 seconds</span></label>
        <div className="coach-actions"><button className="button button-soft" disabled={coaching} onClick={() => saveAnswer({ text: "", mode: answer.mode, updatedAt: new Date().toISOString() })}>↻ Reset</button><button className="button button-primary" disabled={!answer.text.trim() || coaching} onClick={() => void coach()}>{coaching ? "✦ Reviewing evidence…" : "✦ Coach my answer"}</button></div>
        {answer.result && <div className="coach-result" aria-live="polite"><div className="coach-score"><span>{answer.result.score}</span><div><small>COACH SCORE</small><b>{coachScoreLabel(answer.result.score)}</b><p>Rubric {answer.result.rubricVersion} · Coaching guidance, not a hiring decision</p><AIProvenanceBadge value={answer.result.provenance} /></div></div><div className="breakdown-grid">{answer.result.breakdown.map((item) => <div key={item.label}><span>{item.label}</span><b>{item.score}</b><div role="progressbar" aria-label={item.label} aria-valuenow={item.score} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${item.score}%` }} /></div></div>)}</div><div className="feedback-block"><h3>Why this score</h3>{answer.result.critique.map((item) => <p key={item}><span>→</span>{item}</p>)}</div><div className="model-answer"><div><span>✦</span><h3>A behaviorally anchored example</h3><small>Use the evidence pattern, never memorise the script.</small></div><p>{answer.result.modelAnswer}</p></div></div>}
      </section>
    </div>
    <div className="stage-next"><div><span>WHEN YOU’RE READY</span><b>Test your role and domain knowledge.</b></div><button className="button button-primary" onClick={onNext}>Open mastery quiz <span>→</span></button></div>
  </>;
}

function KnowledgeLab({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const [mode, setMode] = useState<"terminology" | "mastery">("terminology");
  return <>
    <StageHeading eyebrow="KNOWLEDGE LAB" title="Learn the language. Prove the judgement." description="Build current plain-English fluency across AI, agentic engineering and every business department, then test either the terms or the decisions your target role demands." />
    <div className="knowledge-lab-switch" role="tablist" aria-label="Knowledge lab mode">
      <button role="tab" aria-selected={mode === "terminology"} className={mode === "terminology" ? "active" : ""} onClick={() => setMode("terminology")}><span>01</span><div><b>Terminology fluency</b><small>Study current AI, technical and business language</small></div><i>→</i></button>
      <button role="tab" aria-selected={mode === "mastery"} className={mode === "mastery" ? "active" : ""} onClick={() => setMode("mastery")}><span>02</span><div><b>Role mastery</b><small>Test judgement and trade-offs for this role</small></div><i>→</i></button>
    </div>
    {mode === "terminology" ? <TerminologyLab job={job} updateJob={updateJob} onNext={onNext} /> : <MasteryQuiz job={job} updateJob={updateJob} onNext={onNext} />}
  </>;
}

function MasteryQuiz({ job, updateJob, onNext }: { job: Job; updateJob: (update: Partial<Job> | ((job: Job) => Job)) => void; onNext: () => void }) {
  const [count, setCount] = useState<5 | 10 | 15>(10);
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => generateQuiz(job, 10));
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizRevision, setQuizRevision] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({}); const [finished, setFinished] = useState(false);
  const correct = questions.filter((item) => answers[item.id] === item.correctIndex).length; const answered = Object.keys(answers).length; const score = Math.round((correct / count) * 100);
  function finish() { if (answered < count) return; const attempt: QuizAttempt = { id: makeId(), score, correct, total: count, createdAt: new Date().toISOString() }; updateJob({ quizAttempts: [...job.quizAttempts, attempt] }); setFinished(true); }
  function restart(nextCount = count) { setCount(nextCount); setAnswers({}); setFinished(false); setQuizRevision((value) => value + 1); }
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setQuizLoading(true); });
    const quizJob = { id: job.id, title: job.title, description: job.description, analysis: job.analysis };
    requestAI<QuizQuestion[]>("quiz", { job: quizJob, count })
      .then(({ result }) => { if (!cancelled) setQuestions(result); })
      .catch(() => { if (!cancelled) setQuestions(generateQuiz(quizJob, count)); })
      .finally(() => { if (!cancelled) setQuizLoading(false); });
    return () => { cancelled = true; };
  }, [job.id, job.title, job.description, job.analysis, count, quizRevision]);
  return <>
    <StageHeading title="Know the role. Not just the script." description="Test the judgement, concepts and trade-offs this role is likely to demand." action={<div className="stage-heading-actions"><AIProvenanceBadge value={questions[0]?.provenance} /><div className="count-picker"><span>{quizLoading ? "Personalising…" : "Questions"}</span>{([5, 10, 15] as const).map((value) => <button key={value} disabled={quizLoading} className={count === value ? "active" : ""} onClick={() => restart(value)}>{value}</button>)}</div></div>} />
    {!finished ? <div className="quiz-layout"><section className="quiz-progress-panel"><div className="quiz-progress-ring" style={{ "--progress": Math.round((answered / count) * 100) } as CSSProperties}><strong>{answered}</strong><span>/ {count}</span></div><h3>{quizLoading ? "Building your quiz" : "Your progress"}</h3><p>{quizLoading ? "Mapping role requirements to applied judgement questions." : "Choose an answer to reveal the reasoning immediately."}</p><div className="quiz-dots">{questions.map((question, index) => <button key={question.id} disabled={quizLoading} className={answers[question.id] !== undefined ? answers[question.id] === question.correctIndex ? "correct" : "wrong" : ""} onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}>{index + 1}</button>)}</div><button className="button button-primary" disabled={quizLoading || answered < count} onClick={finish}>Complete quiz →</button></section><section className={quizLoading ? "quiz-questions is-loading" : "quiz-questions"} aria-busy={quizLoading}>{questions.map((question, questionIndex) => { const choice = answers[question.id]; return <article key={question.id} id={question.id} className={choice !== undefined ? "answered" : ""}><div className="quiz-number">{String(questionIndex + 1).padStart(2, "0")}</div><h2>{question.prompt}</h2><div className="quiz-options">{question.options.map((option, optionIndex) => <button key={option} disabled={quizLoading || choice !== undefined} className={choice !== undefined ? optionIndex === question.correctIndex ? "correct" : optionIndex === choice ? "wrong" : "muted" : ""} onClick={() => setAnswers({ ...answers, [question.id]: optionIndex })}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}<i>{choice !== undefined && optionIndex === question.correctIndex ? "✓" : choice === optionIndex ? "×" : ""}</i></button>)}</div>{choice !== undefined && <div className={choice === question.correctIndex ? "explanation correct" : "explanation"}><b>{choice === question.correctIndex ? "✓ Correct" : `The best answer is ${String.fromCharCode(65 + question.correctIndex)}`}</b><p>{question.explanation}</p></div>}</article>; })}</section></div> : <section className="quiz-summary"><span className="celebration">✦</span><p className="overline">MASTERY QUIZ COMPLETE</p><h1>{score >= 80 ? "You know your material." : "A solid baseline."}</h1><div className="summary-score"><strong>{score}</strong><span>/ 100</span></div><p>You answered <b>{correct} of {count}</b> questions correctly. {score >= 80 ? "You’re demonstrating strong role judgement." : "Review the explanations, then take another pass."}</p><div><button className="button button-soft" onClick={() => restart()}>↻ Try again</button><button className="button button-primary" onClick={onNext}>Build evidence bank →</button></div></section>}
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
  const analysis = job.analysis ?? analyseCandidate(job); const answers = Object.values(job.interviewAnswers).filter((item) => item.result); const average = answers.length ? Math.round(answers.reduce((sum, item) => sum + (item.result?.score ?? 0), 0) / answers.length) : 0; const terminologyAttempts = job.terminologyQuizAttempts ?? []; const knowledgeAttempts = [...job.quizAttempts.map((attempt) => ({ ...attempt, kind: "Role mastery" })), ...terminologyAttempts.map((attempt) => ({ ...attempt, kind: "Terminology" }))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); const latestKnowledge = knowledgeAttempts.at(-1)?.score ?? 0; const readiness = Math.round(analysis.alignmentScore * 0.4 + (average || 55) * 0.25 + (latestKnowledge || 60) * 0.2 + Math.min(100, evidenceItems.length * 18) * 0.15);
  const history = job.analysisHistory.length ? job.analysisHistory : [{ score: analysis.alignmentScore, at: analysis.createdAt }];
  return <>
    <StageHeading eyebrow="YOUR READINESS" title="You’re building real momentum." description={`Your preparation for ${job.title || "this role"} is becoming specific, evidence-backed and easier to recall under pressure.`} action={<button className="button button-soft" onClick={() => window.print()}>↗ Export summary</button>} />
    <section className="readiness-hero"><div className="readiness-ring" style={{ "--readiness": readiness } as CSSProperties}><div><strong>{readiness}</strong><span>readiness</span></div></div><div><span className="overline">OVERALL PREPARATION</span><h2>{readiness >= 80 ? "Interview ready" : "Nearly there"}</h2><p>{readiness >= 80 ? "Your evidence and role knowledge are strong. Keep answers concise and protect your best metrics." : "Close the remaining evidence gaps and coach three more answers to push this plan over the line."}</p><div className="readiness-tags"><span>✓ Role analysed</span><span>✓ Evidence organised</span><span className={answers.length >= 3 ? "" : "pending"}>{answers.length >= 3 ? "✓" : "○"} 3 answers coached</span></div></div><button className="button button-primary" onClick={onReviewGaps}>Review {analysis.gaps.length} evidence gaps →</button></section>
    <div className="metric-grid"><article><span className="metric-icon coral">↗</span><div><small>ALIGNMENT</small><strong>{analysis.alignmentScore}<i>/100</i></strong><p><b>+{Math.max(0, analysis.alignmentScore - history[0].score)}</b> since first analysis</p></div></article><article><span className="metric-icon purple">◉</span><div><small>INTERVIEW PRACTICE</small><strong>{Object.keys(job.interviewAnswers).length}<i>/112</i></strong><p>{average ? <><b>{average}</b> average coach score</> : "Start with three priority questions"}</p></div></article><article><span className="metric-icon blue">◇</span><div><small>KNOWLEDGE</small><strong>{latestKnowledge || "—"}<i>{latestKnowledge ? "%" : ""}</i></strong><p>{knowledgeAttempts.length} quiz attempt{knowledgeAttempts.length === 1 ? "" : "s"} saved</p></div></article><article><span className="metric-icon gold">✦</span><div><small>EVIDENCE BANK</small><strong>{evidenceItems.length}<i>items</i></strong><p><b>{analysis.gaps.length}</b> gaps still open</p></div></article></div>
    <div className="dashboard-grid"><section className="panel trend-panel"><div className="panel-head"><div><span className="overline">ALIGNMENT TREND</span><h2>Your profile is getting sharper</h2></div><span className="mini-pill">Last {history.length} analyses</span></div><div className="chart-area"><div className="chart-lines"><i /><i /><i /><i /></div><div className="chart-bars">{history.map((point, index) => <div key={`${point.at}-${index}`}><b style={{ bottom: `${Math.max(8, point.score - 45)}%` }}>{point.score}</b><span style={{ height: `${Math.max(12, point.score - 40)}%` }} /><small>{formatDate(point.at)}</small></div>)}</div></div></section><section className="panel focus-panel"><div className="panel-head"><div><span className="overline">NEXT BEST ACTIONS</span><h2>Highest-leverage prep</h2></div></div><div className="action-list">{analysis.gaps.slice(0, 3).map((gap, index) => <button key={gap} onClick={onReviewGaps}><span>{String(index + 1).padStart(2, "0")}</span><div><b>Prepare evidence for {gap}</b><p>Add a concrete situation, action and outcome.</p></div><i>→</i></button>)}{answers.length < 3 && <button><span>{String(Math.min(4, analysis.gaps.length + 1)).padStart(2, "0")}</span><div><b>Coach {3 - answers.length} priority answer{3 - answers.length === 1 ? "" : "s"}</b><p>Build calm through a repeatable STAR structure.</p></div><i>→</i></button>}</div></section></div>
    <section className="panel activity-panel"><div className="panel-head"><div><span className="overline">PREPARATION HISTORY</span><h2>Small sessions, compounding confidence</h2></div></div><div className="activity-list"><div><span className="activity-dot coral">↗</span><div><b>Candidate analysis completed</b><p>{analysis.evidenceFound.length} matching proof points and {analysis.gaps.length} gaps identified</p></div><small>{formatDate(analysis.createdAt)}</small></div>{knowledgeAttempts.slice(-3).reverse().map((attempt) => <div key={attempt.id}><span className="activity-dot blue">◇</span><div><b>{attempt.kind} quiz · {attempt.score}%</b><p>{attempt.correct} of {attempt.total} questions correct</p></div><small>{formatDate(attempt.createdAt)}</small></div>)}{evidenceItems.slice(0, 2).map((item) => <div key={item.id}><span className="activity-dot gold">✦</span><div><b>Evidence saved · {item.title}</b><p>{item.metric || item.description.slice(0, 75)}</p></div><small>{formatDate(item.createdAt)}</small></div>)}</div></section>
  </>;
}
