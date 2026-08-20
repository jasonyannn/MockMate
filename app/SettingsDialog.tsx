"use client";

import { useEffect, useRef } from "react";
import { DEFAULT_PREFERENCES, PRACTICE_LANGUAGES } from "@/lib/preferences";
import type { AppPreferences, TextSize } from "@/lib/preferences";

type Props = {
  open: boolean;
  preferences: AppPreferences;
  onChange: (preferences: AppPreferences) => void;
  onClose: () => void;
};

export function SettingsDialog({ open, preferences, onChange, onClose }: Props) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => dialogRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, select, [tabindex]:not([tabindex='-1'])")].filter((element) => !element.hasAttribute("disabled"));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1) ?? first;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus.current?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  const update = <Key extends keyof AppPreferences>(key: Key, value: AppPreferences[Key]) => onChange({ ...preferences, [key]: value });

  return (
    <div className="modal-backdrop settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="settings-title" tabIndex={-1}>
        <div className="settings-head">
          <div><span className="overline">PERSONALISE MOCKMATE</span><h2 id="settings-title">Accessibility & language</h2><p>Make interview preparation easier to see, hear and control.</p></div>
          <button onClick={onClose} aria-label="Close settings">×</button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><span aria-hidden="true">◖</span><div><h3>Language & voice</h3><p>Used for microphone transcription and question read-aloud.</p></div></div>
          <div className="settings-fields two">
            <label>Practice language<select value={preferences.practiceLanguage} onChange={(event) => update("practiceLanguage", event.target.value)}>{PRACTICE_LANGUAGES.map((language) => <option value={language.value} key={language.value}>{language.label}</option>)}</select></label>
            <label>Read-aloud speed<select value={preferences.speechRate} onChange={(event) => update("speechRate", Number(event.target.value) as AppPreferences["speechRate"])}><option value={0.75}>Slower</option><option value={1}>Normal</option><option value={1.25}>Faster</option></select></label>
          </div>
          <p className="settings-note">MockMate’s interface is currently English. Speech recognition availability varies by language and browser.</p>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><span aria-hidden="true">Aa</span><div><h3>Vision & reading</h3><p>Adjust legibility without changing your content.</p></div></div>
          <fieldset className="text-size-field"><legend>Text and interface size</legend>{(["default", "large", "extra-large"] as TextSize[]).map((size) => <button type="button" key={size} className={preferences.textSize === size ? "active" : ""} aria-pressed={preferences.textSize === size} onClick={() => update("textSize", size)}>{size === "default" ? "Default" : size === "large" ? "Large" : "Extra large"}</button>)}</fieldset>
          <div className="setting-toggles">
            <SettingToggle checked={preferences.highContrast} onChange={(checked) => update("highContrast", checked)} title="High contrast" description="Stronger text, borders and controls for low vision." />
            <SettingToggle checked={preferences.dyslexiaFont} onChange={(checked) => update("dyslexiaFont", checked)} title="Reading-friendly font" description="Uses wider, simpler letter shapes and spacing." />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title"><span aria-hidden="true">⌨</span><div><h3>Movement & assistive technology</h3><p>Designed for keyboards, screen readers and motion sensitivity.</p></div></div>
          <div className="setting-toggles">
            <SettingToggle checked={preferences.reduceMotion} onChange={(checked) => update("reduceMotion", checked)} title="Reduce motion" description="Removes animation and smooth scrolling." />
            <SettingToggle checked={preferences.enhancedFocus} onChange={(checked) => update("enhancedFocus", checked)} title="Enhanced keyboard focus" description="Makes the currently selected control more obvious." />
            <SettingToggle checked={preferences.verboseAnnouncements} onChange={(checked) => update("verboseAnnouncements", checked)} title="Detailed screen-reader announcements" description="Announces microphone, scoring and navigation changes." />
          </div>
          <div className="accessibility-help"><b>Built-in access</b><p>Use <kbd>Tab</kbd> to move, <kbd>Enter</kbd> to activate, <kbd>Esc</kbd> to close dialogs and <kbd>Alt</kbd> + <kbd>S</kbd> to open settings. A skip link is available at the top of every workspace.</p></div>
        </div>

        <div className="settings-actions"><button className="text-button" onClick={() => onChange(DEFAULT_PREFERENCES)}>Reset defaults</button><button className="button button-primary" onClick={onClose}>Save & close</button></div>
      </section>
    </div>
  );
}

function SettingToggle({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return <label className="setting-toggle" aria-label={title}><span><b>{title}</b><small>{description}</small></span><input type="checkbox" aria-label={title} checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}
