import 'server-only'
import { GoogleGenAI, ApiError } from '@google/genai'

const MODEL = 'gemini-3.6-flash'

let client: GoogleGenAI | null | undefined

function getClient(): GoogleGenAI | null {
  if (client !== undefined) return client
  const apiKey = process.env.GEMINI_API_KEY
  client = apiKey ? new GoogleGenAI({ apiKey }) : null
  return client
}

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'missing_key' | 'rate_limited' | 'error'; message: string }

// Small wrapper shared by every feature that calls the Gemini API, so rate-limit
// and missing-key handling only lives in one place.
export async function generateText(prompt: string): Promise<GeminiResult> {
  const ai = getClient()
  if (!ai) {
    return {
      ok: false,
      reason: 'missing_key',
      message: 'AI coaching isn’t set up yet — add a GEMINI_API_KEY to enable it.',
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    })
    const text = response.text
    if (!text) {
      return { ok: false, reason: 'error', message: 'No response from AI — try again in a moment.' }
    }
    return { ok: true, text }
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'AI coaching has hit its free-tier limit for now — try again in a minute.',
      }
    }
    return { ok: false, reason: 'error', message: 'Couldn’t reach the AI right now — try again in a moment.' }
  }
}
