import type { AIProvenance } from "./types";

export type AIStatus = {
  configured: boolean;
  model: string;
  provider: "openai" | "deterministic-fallback";
};

export type AIResponse<T> = {
  result: T;
  provenance: AIProvenance;
};

export async function getAIStatus(): Promise<AIStatus> {
  const response = await fetch("/api/ai", { cache: "no-store" });
  if (!response.ok) throw new Error("AI status is unavailable");
  return response.json() as Promise<AIStatus>;
}

export async function requestAI<T>(action: "analyse" | "questions" | "coach" | "quiz" | "terminology", payload: unknown): Promise<AIResponse<T>> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  const data = await response.json() as AIResponse<T> & { error?: string };
  if (!response.ok) throw new Error(data.error || "AI request failed");
  return data;
}
