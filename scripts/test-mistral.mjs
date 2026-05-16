// Verifica que MISTRAL_API_KEY funcione.
// Uso: node --env-file=.env.local scripts/test-mistral.mjs

const key = process.env.MISTRAL_API_KEY;
if (!key) {
  console.error("Falta MISTRAL_API_KEY en .env.local");
  process.exit(1);
}

const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model: "mistral-small-latest",
    messages: [{ role: "user", content: "Responde unicamente con: OK" }],
    max_tokens: 10,
  }),
});

console.log("HTTP", res.status);
const data = await res.json();
if (res.ok) {
  console.log("Respuesta del modelo:", data.choices?.[0]?.message?.content);
  console.log("Modelo:", data.model);
} else {
  console.log("Error:", JSON.stringify(data));
  process.exitCode = 1;
}
