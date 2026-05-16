import { env } from "@/lib/env";

// Cliente de Mistral AI (chat completions). API REST.
// Docs: https://docs.mistral.ai/api/

const API_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Llama a Mistral y devuelve el texto de la respuesta. */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.mistralApiKey()}`,
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 400,
      temperature: opts.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Mistral falló (HTTP ${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Mistral devolvió una respuesta vacía");
  }
  return content.trim();
}
