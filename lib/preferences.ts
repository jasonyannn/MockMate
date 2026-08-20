export type TextSize = "default" | "large" | "extra-large";

export type AppPreferences = {
  practiceLanguage: string;
  speechRate: 0.75 | 1 | 1.25;
  textSize: TextSize;
  highContrast: boolean;
  reduceMotion: boolean;
  dyslexiaFont: boolean;
  enhancedFocus: boolean;
  verboseAnnouncements: boolean;
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  practiceLanguage: "en-AU",
  speechRate: 1,
  textSize: "default",
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  enhancedFocus: true,
  verboseAnnouncements: true,
};

export const PREFERENCES_STORAGE_KEY = "mockmate-accessibility-preferences";

export const PRACTICE_LANGUAGES = [
  { value: "en-AU", label: "English — Australia" },
  { value: "en-GB", label: "English — United Kingdom" },
  { value: "en-US", label: "English — United States" },
  { value: "zh-CN", label: "Mandarin Chinese — Simplified" },
  { value: "zh-HK", label: "Cantonese — Hong Kong" },
  { value: "es-ES", label: "Spanish" },
  { value: "fr-FR", label: "French" },
  { value: "de-DE", label: "German" },
  { value: "hi-IN", label: "Hindi" },
  { value: "ar-SA", label: "Arabic" },
  { value: "pt-BR", label: "Portuguese — Brazil" },
  { value: "vi-VN", label: "Vietnamese" },
  { value: "ja-JP", label: "Japanese" },
  { value: "ko-KR", label: "Korean" },
  { value: "id-ID", label: "Indonesian" },
] as const;

export function readPreferences(value: string | null): AppPreferences {
  if (!value) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<AppPreferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
