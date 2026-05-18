import { env } from "@/lib/env";

// Cliente de MiniMax — Text-to-Audio (T2A v2).
// Docs: https://platform.minimax.io/docs/api-reference/speech-t2a-http
//
// Es la voz de salida del copiloto: con el modo "Comando voz" activo, la
// respuesta del agente Mistral se sintetiza con MiniMax. La API key vive solo
// en el servidor — el navegador nunca la ve; la llamada pasa por /api/tts.

const API_BASE =
  process.env.MINIMAX_API_BASE?.trim() || "https://api.minimax.io";
const MODEL = process.env.MINIMAX_MODEL?.trim() || "speech-02-hd";
const VOICE_ID = process.env.MINIMAX_VOICE_ID?.trim() || "Spanish_SereneWoman";

export interface SpeechResult {
  ok: boolean;
  audioBase64?: string;
  format?: string;
  error?: string;
}

interface T2AResponse {
  data?: { audio?: string; status?: number };
  base_resp?: { status_code?: number; status_msg?: string };
}

/**
 * Sintetiza `text` con la API T2A de MiniMax y devuelve el MP3 en base64.
 * MiniMax responde el audio como cadena hexadecimal; aquí se convierte a
 * base64 para enviarlo al cliente en JSON. Ante cualquier fallo devuelve
 * `ok: false` — quien llama decide el respaldo (el copiloto cae al TTS
 * nativo del navegador).
 */
export async function synthesizeSpeech(text: string): Promise<SpeechResult> {
  const clean = text.trim().slice(0, 9000);
  if (!clean) return { ok: false, error: "Texto vacío." };

  let apiKey: string;
  try {
    apiKey = env.minimaxApiKey();
  } catch {
    return { ok: false, error: "MINIMAX_API_KEY no está configurada." };
  }

  const groupId = process.env.MINIMAX_GROUP_ID?.trim();
  const url =
    `${API_BASE}/v1/t2a_v2` +
    (groupId ? `?GroupId=${encodeURIComponent(groupId)}` : "");

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        text: clean,
        stream: false,
        language_boost: "Spanish",
        voice_setting: {
          voice_id: VOICE_ID,
          speed: 1.05,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `MiniMax inalcanzable: ${(err as Error).message}`,
    };
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    return { ok: false, error: `MiniMax HTTP ${res.status}: ${detail}` };
  }

  const json = (await res.json().catch(() => null)) as T2AResponse | null;
  if (!json) return { ok: false, error: "MiniMax: respuesta ilegible." };

  const code = json.base_resp?.status_code;
  if (code !== 0) {
    return {
      ok: false,
      error: `MiniMax: ${json.base_resp?.status_msg ?? "error"} (code ${code ?? "?"})`,
    };
  }

  const hex = json.data?.audio;
  if (!hex) return { ok: false, error: "MiniMax no devolvió audio." };

  const audioBase64 = Buffer.from(hex, "hex").toString("base64");
  return { ok: true, audioBase64, format: "audio/mpeg" };
}
