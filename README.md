# Sistema de Alerta Temprana de Huaicos

> Predice huaicos e inundaciones repentinas, alerta a la población por Telegram y
> coordina la respuesta. Construido para **hack@latam 2026** — track *Environment & Climate Risk*.

Caso piloto: **Quebrada Quirio (Chosica, Lima)**. Arquitectura **generalizable a cualquier cuenca**.

## El problema

Los huaicos en quebradas como Quirio (Chosica) causan pérdidas porque el aviso llega tarde:
los sistemas oficiales emiten avisos regionales amplios, pero no hay predicción por quebrada
ni alerta de última milla al vecino. Cuando alguien reporta que "ya viene el huaico", solo
quedan minutos.

## Cómo funciona

Tres capas. **La regla decide, el ML contextualiza, el LLM entiende y comunica, Telegram opera.**

- **Capa 1 — Predicción.** Un scheduler ingiere lluvia satelital (GPM IMERG) de la cuenca alta
  y evalúa el riesgo con un **umbral hidrometeorológico calibrado** (regla determinista,
  auditable). Si cruza umbral → `PREALERTA`.
- **Capa 2 — Corroboración.** Un aviso de SENAMHI o un reporte ciudadano aguas arriba
  *confirman* la amenaza → escala a `EVACUACIÓN`.
- **Capa 3 — Resiliencia.** Si los feeds públicos fallan, un reporte ciudadano activa un
  `WATCH` degradado.

La IA está donde aporta: **LLM** para estructurar señales, triar reportes (texto/foto/voz) y
redactar alertas; **ML** para modular el umbral según la susceptibilidad del terreno. La
decisión de riesgo nunca es una caja negra.

## Stack

| Componente            | Tecnología                          |
| --------------------- | ----------------------------------- |
| App + API + dashboard | Next.js + TypeScript (Vercel)       |
| Base de datos         | Postgres (Supabase)                 |
| Jobs programados      | Vercel Cron                         |
| LLM                   | Mistral AI (primario) · OpenRouter (fallback) |
| Mensajería            | Telegram Bot API                    |
| Voz / TTS             | MiniMax T2A (voz del copiloto)      |
| Datos                 | GPM IMERG (NASA) · avisos SENAMHI   |

## Estructura del repo

```
db/
  schema.sql        Esquema Postgres (capas A-H del blueprint)
  seed_quirio.sql   Configuración de la cuenca piloto
.env.example        Variables de entorno requeridas
```

*(El scaffold de la app Next.js se añade a continuación.)*

## Requisitos previos

Necesitas crear estas cuentas y obtener sus claves (todas tienen plan gratuito o crédito de
la hackathon):

- **Vercel** — despliegue (conectar este repo)
- **Supabase** — base de datos Postgres + Storage
- **Telegram** — un bot creado con [@BotFather](https://t.me/BotFather)
- **Mistral AI** — API key, proveedor LLM primario (console.mistral.ai, tier gratis)
- **OpenRouter** — API key, fallback LLM
- **MiniMax** — API key para la voz del copiloto (TTS)
- **NASA Earthdata** — cuenta para descargar GPM IMERG

Copia `.env.example` a `.env.local` y completa los valores. **Nunca** commitees `.env.local`.

## Despliegue

1. Conecta este repo a Vercel (cada `git push` despliega).
2. Configura las variables de entorno en Vercel.
3. Registra el webhook del bot de Telegram apuntando a la URL pública de Vercel.

## Estado

Proyecto de hackathon (72 h). Alcance MVP y stretch documentados en el blueprint del proyecto.

## Licencia

[MIT](./LICENSE).
