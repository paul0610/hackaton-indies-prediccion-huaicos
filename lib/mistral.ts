import { env } from "@/lib/env";

// Cliente de Mistral AI. API REST. Docs: https://docs.mistral.ai/api/

const API_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_MODEL = "mistral-small-latest";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Llama a Mistral (chat completion) y devuelve el texto de la respuesta. */
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
  if (!content) throw new Error("Mistral devolvió una respuesta vacía");
  return content.trim();
}

// ---- Agente con herramientas (function calling) ----

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AgentResult {
  answer: string;
  toolsUsed: string[];
}

/**
 * Ejecuta un agente Mistral con herramientas: el modelo decide qué
 * herramientas llamar, se ejecutan, se le devuelven los resultados y el
 * ciclo se repite hasta que produce una respuesta final.
 */
export async function runAgent(opts: {
  system: string;
  user: string;
  tools: AgentTool[];
  execute: (name: string, args: Record<string, unknown>) => Promise<string>;
  maxSteps?: number;
}): Promise<AgentResult> {
  const messages: unknown[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];
  const mistralTools = opts.tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
  const toolsUsed: string[] = [];
  const maxSteps = opts.maxSteps ?? 4;

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.mistralApiKey()}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages,
        tools: mistralTools,
        tool_choice: "auto",
        max_tokens: 600,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Mistral falló (HTTP ${res.status}): ${detail.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: string;
          tool_calls?: {
            id: string;
            function?: { name?: string; arguments?: string };
          }[];
        };
      }[];
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("Mistral devolvió una respuesta vacía");

    const toolCalls = msg.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { answer: (msg.content ?? "").trim(), toolsUsed };
    }

    messages.push(msg);
    for (const tc of toolCalls) {
      const name = tc.function?.name ?? "";
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function?.arguments ?? "{}");
      } catch {
        args = {};
      }
      toolsUsed.push(name);
      let result: string;
      try {
        result = await opts.execute(name, args);
      } catch (err) {
        result = `Error: ${(err as Error).message}`;
      }
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name,
        content: result,
      });
    }
  }
  return {
    answer: "No pude completar la consulta dentro de los pasos disponibles.",
    toolsUsed,
  };
}
