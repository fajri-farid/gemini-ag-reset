import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const RESET_CONFIDENCE_THRESHOLD = 0.85;
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export interface ClassificationResult {
  isReset: boolean;
  confidence: number;
  summary: string | null;
}

export interface ResetClassifier {
  classify(tweetText: string): Promise<ClassificationResult>;
}

const ClassifierResponseSchema = z.object({
  is_reset: z.boolean(),
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().max(240).nullable().optional(),
});

const CLASSIFIER_SYSTEM_PROMPT = `You classify tweets from @_mohansolo (Varun Mohan) to determine whether the tweet announces that Gemini / Antigravity usage quota has been reset (or is actively resetting now) for users.

Rules:
- Return is_reset: true ONLY when the tweet announces an actual quota reset that just happened or is going live now.
- Recognize both explicit announcements (e.g. "Resetting Gemini quota for all Antigravity users...") and casual/short/typo phrasing (e.g. "Rest will happen!", "Quota reset is live", "Enjoy the reset").
- Return is_reset: false for general product updates, unrelated commentary, memes, hiring posts, or vague replies without a reset announcement.
- Provide a confidence score from 0.0 to 1.0.
- Provide summary as a concise single English sentence (max 160 chars) describing the announcement, or an empty string if not a reset.`;

export class GeminiResetClassifier implements ResetClassifier {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.apiKey = (options?.apiKey ?? process.env.GEMINI_API_KEY ?? "").trim();
    this.model = (
      options?.model ??
      process.env.GEMINI_MODEL ??
      DEFAULT_GEMINI_MODEL
    ).trim();
  }

  async classify(tweetText: string): Promise<ClassificationResult> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const trimmedTweet = tweetText.trim();
    if (!trimmedTweet) {
      return {
        isReset: false,
        confidence: 0,
        summary: null,
      };
    }

    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const interaction = await ai.interactions.create({
      model: this.model,
      system_instruction: CLASSIFIER_SYSTEM_PROMPT,
      input: trimmedTweet,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: {
          type: "object",
          properties: {
            is_reset: { type: "boolean" },
            confidence: { type: "number" },
            summary: { type: "string" },
          },
          required: ["is_reset", "confidence", "summary"],
        },
      },
    });

    const rawText = interaction.output_text?.trim();
    if (!rawText) {
      throw new Error("Gemini returned an empty classification response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error("Gemini returned non-JSON classification output.");
    }

    const validated = ClassifierResponseSchema.parse(parsedJson);
    const cleanSummary = validated.summary?.trim() || null;

    return {
      isReset: validated.is_reset,
      confidence: validated.confidence,
      summary: cleanSummary,
    };
  }
}

export function createDefaultResetClassifier(): ResetClassifier {
  return new GeminiResetClassifier();
}
