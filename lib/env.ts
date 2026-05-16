// Acceso tipado a variables de entorno.
// Getters perezosos: una variable solo falla si se usa y no está definida,
// para no bloquear partes del sistema que no la necesitan.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: () => required("DATABASE_URL"),
  supabaseUrl: () => required("SUPABASE_URL"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  mistralApiKey: () => required("MISTRAL_API_KEY"),
  openrouterApiKey: () => required("OPENROUTER_API_KEY"),
  telegramBotToken: () => required("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: () => required("TELEGRAM_WEBHOOK_SECRET"),
  minimaxApiKey: () => required("MINIMAX_API_KEY"),
  minimaxGroupId: () => required("MINIMAX_GROUP_ID"),
  earthdataToken: () => required("EARTHDATA_TOKEN"),
  cronSecret: () => required("CRON_SECRET"),
};
