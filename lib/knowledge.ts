import { embed } from "@/lib/mistral";

// ============================================================
// Base de conocimiento del copiloto (RAG).
//
// Corpus curado: protocolos por nivel, metodología del sistema,
// indicadores de huaico, loop ciudadano, zonas del piloto, y guía
// operativa. La metodología y las zonas son datos reales del sistema;
// los indicadores provienen de investigación citada; los protocolos
// son guía operativa curada (no texto oficial literal).
// ============================================================

interface Chunk {
  title: string;
  text: string;
}

const CORPUS: Chunk[] = [
  {
    title: "Nivel de riesgo: Calma (sin riesgo)",
    text: "Estado normal del sistema. No hay disparadores activos. El sistema sigue ingiriendo lluvia y evaluando cada pocos minutos. El coordinador solo monitorea.",
  },
  {
    title: "Nivel de riesgo: Vigilancia",
    text: "Hay una señal de riesgo sin corroborar, por ejemplo un reporte ciudadano sin datos oficiales que lo confirmen. El coordinador revisa la situación, mantiene contacto con las brigadas y se mantiene atento por si el nivel sube.",
  },
  {
    title: "Nivel de riesgo: Prealerta",
    text: "La lluvia cruzó el umbral de la cuenca, o hay un aviso oficial vigente. El sistema notifica a los vecinos por Telegram: deben preparar su mochila de emergencia y documentos, y estar listos para evacuar. Las brigadas se alistan. Aún no es la orden final de evacuación.",
  },
  {
    title: "Nivel de riesgo: Evacuación",
    text: "Riesgo alto y corroborado de huaico. Es orden de evacuar de inmediato hacia el punto seguro de la zona. No cruzar el cauce ni caminar por la ribera. Las brigadas guían la salida y priorizan a la población vulnerable.",
  },
  {
    title: "Qué hace el coordinador al declararse evacuación",
    text: "Confirmar que las alertas se enviaron a todas las zonas, activar a las brigadas comunitarias por zona, monitorear la cola de ayuda en el panel, y escalar a Defensa Civil y bomberos si hay personas atrapadas o heridas.",
  },
  {
    title: "Cómo decide el sistema el nivel de riesgo",
    text: "Un motor de decisión determinista y auditable. Compara la lluvia acumulada en 3 horas con un umbral efectivo. Si la lluvia cruza el umbral y además hay corroboración (un aviso oficial o un reporte ciudadano), el nivel sube a Evacuación.",
  },
  {
    title: "Qué es el umbral efectivo",
    text: "Cada cuenca tiene un umbral base de lluvia. Ese umbral lo bajan dos factores: la susceptibilidad del terreno y la humedad antecedente del suelo. Terreno más propenso o suelo ya húmedo significan umbral más bajo, es decir, menos lluvia para disparar la alerta.",
  },
  {
    title: "Por qué el umbral base de Quirio es 12 mm",
    text: "Se recalibró de 15 a 12 mm tras un backtest contra el huaico real de Chosica de marzo de 2017 (El Niño Costero), cuyo pico de lluvia en 3 horas fue de 11.6 mm. Con base 12, el umbral efectivo baja a cerca de 9.7 mm y el sistema sí detecta ese evento con margen.",
  },
  {
    title: "Por qué el motor es determinista y no una caja negra",
    text: "Cada alerta debe poder explicarse y auditarse: el coordinador necesita saber por qué se disparó. La IA contextualiza ajustando el umbral según el terreno, pero la regla es la que decide. Así ninguna alerta es inexplicable.",
  },
  {
    title: "Humedad antecedente del suelo",
    text: "Un índice que combina la lluvia de las últimas 24 horas, 72 horas y 7 días. Un suelo ya saturado por lluvia previa necesita menos lluvia nueva para fallar, por eso el sistema baja el umbral cuando la humedad antecedente es alta.",
  },
  {
    title: "Susceptibilidad del terreno",
    text: "Mide qué tan propenso es el terreno a deslizamientos, según pendiente, tipo de suelo y cercanía al drenaje. En la cuenca piloto es un valor calibrado; el siguiente paso del roadmap es derivarla de un modelo del terreno tipo NASA LHASA.",
  },
  {
    title: "La combinación robusta de indicadores para huaicos",
    text: "No existe un único indicador mágico. Lo confiable es combinar lluvia acumulada, umbral calibrado por cuenca, humedad antecedente del suelo y susceptibilidad del terreno.",
  },
  {
    title: "Indicador: lluvia acumulada",
    text: "La lluvia sumada en 3, 6, 24 y 72 horas activa la escorrentía y las crecidas. Es el disparador principal del sistema, con una ventana útil de horas a un par de días.",
  },
  {
    title: "Indicador: intensidad de lluvia de corta duración",
    text: "La lluvia muy intensa en 30 minutos a 3 horas predice crecidas súbitas en quebradas pequeñas, con una ventana de 0 a 6 horas.",
  },
  {
    title: "Flash Flood Guidance (WMO)",
    text: "Guía operativa que estima cuánta lluvia se necesita para generar escorrentía rápida, según el estado de humedad del terreno. Ventana de 1 a 6 horas. Útil para quebradas y zonas urbanas.",
  },
  {
    title: "NASA LHASA",
    text: "Modelo de la NASA que estima la probabilidad de deslizamientos combinando lluvia y susceptibilidad del terreno, con una ventana de 0 a 24 horas. El motor del sistema usa una idea similar, simplificada.",
  },
  {
    title: "Copernicus GloFAS",
    text: "Sistema global de alerta de inundaciones. Es bueno para crecidas de ríos grandes, pero no es la herramienta adecuada para flash floods ni quebradas pequeñas como Quirio.",
  },
  {
    title: "Evidencia científica en Perú",
    text: "Un estudio publicado en NHESS (2023) estima umbrales de lluvia para deslizamientos someros en el Perú. Respalda el enfoque de umbrales de lluvia que usa este sistema.",
  },
  {
    title: "Fuentes de datos meteorológicos",
    text: "El piloto usa Open-Meteo para la lluvia (pronóstico e histórico, gratis y global). En producción se sumarían IMERG satelital de la NASA y las estaciones y avisos de SENAMHI. La quebrada Quirio drena al río Rímac, monitoreado por SENAMHI en la cuenca CHIRILU.",
  },
  {
    title: "Cómo responde un vecino a la alerta",
    text: "El vecino recibe la alerta por Telegram con dos botones: 'Estoy a salvo' y 'Necesito ayuda'. Además puede compartir su ubicación GPS para que la brigada lo encuentre.",
  },
  {
    title: "La cola de ayuda",
    text: "Los vecinos que pulsan 'Necesito ayuda' entran a una cola que el coordinador ve en el panel, con su ubicación. Sirve para asignar brigadas y priorizar el rescate.",
  },
  {
    title: "Suscripción del vecino al bot",
    text: "El vecino escribe /start en el bot de Telegram y se suscribe a su zona. Así recibe únicamente las alertas de la zona donde vive.",
  },
  {
    title: "La cuenca piloto: Quebrada Quirio",
    text: "El sistema corre como piloto en la Quebrada Quirio, en Chosica, Lima. Tiene tres zonas pobladas: Nicolás de Piérola, Libertadores/Precursores y Las Casuarinas.",
  },
  {
    title: "Puntos seguros y tiempo de impacto por zona",
    text: "Cada zona tiene un punto seguro asignado, un parque o plaza en alto hacia donde evacuar. El huaico baja de la cuenca alta a la desembocadura, así que cada zona tiene un tiempo de impacto distinto.",
  },
  {
    title: "Riesgo por cuenca, prioridad por zona",
    text: "El nivel de riesgo se calcula a nivel de cuenca, porque un solo sensor de lluvia en la cabecera alimenta toda la quebrada. La prioridad operativa sí es por zona: depende del tiempo de impacto, la exposición y los pedidos de ayuda.",
  },
  {
    title: "Escalamiento a otros organismos",
    text: "Ante personas atrapadas o heridas, el coordinador escala a los bomberos y a Defensa Civil. Para la atención posterior al evento, damnificados y salud, se coordina con la Cruz Roja. El sistema centraliza la información para esa coordinación.",
  },
  {
    title: "Atención a población vulnerable",
    text: "Adultos mayores, personas con discapacidad, niños y enfermos deben evacuar primero y con apoyo de una brigada. Si un vecino reporta que no puede salir solo, esa dirección se prioriza en la cola de ayuda.",
  },
  {
    title: "Señales de huaico inminente en campo",
    text: "Aumento súbito del caudal, agua turbia cargada de lodo y piedras, un ruido fuerte que viene de aguas arriba, y olor a tierra húmeda. Ante cualquiera de estas señales, evacuar de inmediato sin esperar la alerta.",
  },
  {
    title: "Regla de oro de la evacuación",
    text: "Nunca cruzar el cauce ni caminar por la ribera de la quebrada. Subir a una zona alta por las rutas señaladas. No regresar a la vivienda por pertenencias. Seguir las indicaciones de la brigada.",
  },
];

// Cache en memoria de los embeddings del corpus (se calcula una sola vez).
let corpusVectors: number[][] | null = null;

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/**
 * Recupera (RAG) los fragmentos de la base de conocimiento más relevantes
 * a la consulta. Embebe el corpus una sola vez y lo cachea en memoria.
 */
export async function retrieveKnowledge(query: string, k = 4): Promise<string> {
  if (!corpusVectors) {
    corpusVectors = await embed(CORPUS.map((c) => `${c.title}. ${c.text}`));
  }
  const vectors = corpusVectors!;
  const [queryVec] = await embed([query]);
  const ranked = CORPUS.map((chunk, i) => ({
    chunk,
    score: cosine(queryVec, vectors[i]),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return ranked
    .map((r) => `## ${r.chunk.title}\n${r.chunk.text}`)
    .join("\n\n");
}
